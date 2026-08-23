import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AgGridAngular } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, ModuleRegistry, themeQuartz } from 'ag-grid-community';

import { AppHeaderComponent } from '../shared/app-header.component';
import { BackdropCloseDirective } from '../shared/backdrop-close.directive';
import { AppUser, AppUserService } from '../services/appuser.service';
import { AppUserActionsCellRendererComponent } from './app-user-actions-cell-renderer.component';
import { AppUserFormModalComponent } from './app-user-form-modal.component';
import { RegisterModalComponent } from './register-modal.component';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-app-users',
  standalone: true,
  imports: [
    CommonModule,
    AppHeaderComponent,
    AgGridAngular,
    AppUserFormModalComponent,
    RegisterModalComponent,
    BackdropCloseDirective
  ],
  templateUrl: './app-users.component.html',
  styleUrls: ['./app-users.component.css']
})
export class AppUsersComponent implements OnInit {
  loading = signal(false);
  quickFilterText = signal('');
  rowData = signal<AppUser[]>([]);

  formModalOpen = signal(false); // controls the Edit App User modal's visibility
  editingUser = signal<AppUser | null>(null);

  registerModalOpen = signal(false); // controls the Register New App User modal's visibility

  confirmDeleteOpen = signal(false); // controls the "Are you sure...?" dialog
  userPendingDelete = signal<AppUser | null>(null);
  deleting = signal(false); // true while the delete-app-user API call is in flight
  deleteError = signal<string | null>(null); // set when the delete call fails
  deleteSuccessMessage = signal<string | null>(null); // set on success; shown for 900ms before the dialog closes

  // AG Grid v33+ Theming API - matches the app's blue accent colour (same as Roles/Items).
  theme = themeQuartz.withParams({
    accentColor: '#2563eb',
    borderRadius: 6,
    headerFontWeight: 600,
    headerBackgroundColor: '#eef2fb',
    chromeBackgroundColor: '#eef2fb'
  });

  defaultColDef: ColDef = {
    sortable: true,
    filter: false,
    resizable: true,
    minWidth: 110
  };

  columnDefs: ColDef<AppUser>[] = [
    {
      colId: 'id',
      field: 'id',
      headerName: 'Id',
      flex: 1,
      minWidth: 90,
      headerClass: 'header-center',
      cellClass: 'cell-center'
    },
    {
      colId: 'username',
      field: 'username',
      headerName: 'Username',
      flex: 2,
      minWidth: 160,
      headerClass: 'header-left',
      cellClass: 'cell-left'
    },
    {
      colId: 'email',
      field: 'email',
      headerName: 'Email',
      flex: 2,
      minWidth: 200,
      headerClass: 'header-left',
      cellClass: 'cell-left'
    },
    {
      colId: 'role',
      field: 'role',
      headerName: 'Role',
      flex: 1,
      minWidth: 140,
      headerClass: 'header-left',
      cellClass: 'cell-left'
    },
    {
      colId: 'actions',
      headerName: 'Actions',
      minWidth: 90,
      maxWidth: 90,
      sortable: false,
      resizable: false,
      pinned: 'right',
      headerClass: ['header-center', 'actions-col-bg'],
      cellClass: ['cell-center', 'actions-col-bg'],
      cellRenderer: AppUserActionsCellRendererComponent,
      cellRendererParams: {
        onEdit: (user: AppUser) => this.onEditUser(user),
        onDelete: (user: AppUser) => this.onDeleteUser(user)
      }
    }
  ];

  constructor(private appUserService: AppUserService) {}

  ngOnInit(): void {
    this.loadAppUsers();
  }

  private loadAppUsers(): void {
    this.loading.set(true);
    this.appUserService.getAppUsers().subscribe({
      next: (users) => {
        this.loading.set(false);
        this.rowData.set(users);
      },
      error: () => this.loading.set(false)
    });
  }

  onQuickFilterInput(value: string): void {
    this.quickFilterText.set(value);
  }

  onClearSearch(): void {
    this.quickFilterText.set('');
  }

  onRegisterNewUser(): void {
    this.registerModalOpen.set(true);
  }

  // Covers both a plain Cancel/X (no new user) and Close after a successful registration -
  // refreshing on every close is a no-op API call in the former case and the actual point
  // of the latter.
  onRegisterModalClosed(): void {
    this.registerModalOpen.set(false);
    this.loadAppUsers();
  }

  onEditUser(user: AppUser): void {
    this.editingUser.set(user);
    this.formModalOpen.set(true);
  }

  // Covers both a plain Cancel/X (no changes) and Close after a successful save -
  // refreshing on every close is a no-op API call in the former case and the
  // actual point of the latter.
  onFormModalClosed(): void {
    this.formModalOpen.set(false);
    this.editingUser.set(null);
    this.loadAppUsers();
  }

  onDeleteUser(user: AppUser): void {
    this.userPendingDelete.set(user);
    this.deleteError.set(null);
    this.confirmDeleteOpen.set(true);
  }

  // "Yes" in the confirmation dialog - calls DELETE /api/AppUser/{id}. On
  // success the dialog stays open for 900ms showing a success message, then closes
  // and the grid is refreshed from the server.
  onConfirmDeleteYes(): void {
    const user = this.userPendingDelete();
    if (!user) {
      return;
    }

    this.deleteError.set(null);
    this.deleting.set(true);

    this.appUserService.deleteAppUser(user.id).subscribe({
      next: (response) => {
        this.deleting.set(false);
        this.deleteSuccessMessage.set(response?.trim() || 'App user deleted successfully.');

        setTimeout(() => {
          this.confirmDeleteOpen.set(false);
          this.deleteSuccessMessage.set(null);
          this.userPendingDelete.set(null);
          this.loadAppUsers();
        }, 900);
      },
      error: (err: HttpErrorResponse) => {
        this.deleting.set(false);
        this.deleteError.set(this.extractErrorMessage(err));
      }
    });
  }

  onConfirmDeleteNo(): void {
    this.confirmDeleteOpen.set(false);
    this.userPendingDelete.set(null);
    this.deleteError.set(null);
  }

  // deleteAppUser() uses responseType: 'text', so err.error holds the API's raw
  // response body on failure - it's usually a JSON string like
  // {"status":400,"message":"..."}, so pull out just the message. Fall back to
  // err.message only for network-level failures (e.g. CORS, connection refused)
  // that never reached the server.
  private extractErrorMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string' && err.error.trim().length > 0) {
      try {
        const parsed = JSON.parse(err.error);
        // ModelState validation failures carry the real per-field messages in "errors"
        // - "message" on its own is just the generic "Validation failed" wrapper text.
        if (Array.isArray(parsed?.errors) && parsed.errors.length > 0) {
          const messages = parsed.errors
            .flatMap((e: any) => (Array.isArray(e?.Value) ? e.Value : []))
            .filter((m: any) => typeof m === 'string' && m.trim().length > 0);
          if (messages.length > 0) {
            return messages.join(' ');
          }
        }
        if (parsed && typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
          return parsed.message;
        }
      } catch {
        // Not JSON - fall through and use the raw string as-is.
      }
      return err.error;
    }
    return err.message || 'Failed to delete app user. Please try again.';
  }
}

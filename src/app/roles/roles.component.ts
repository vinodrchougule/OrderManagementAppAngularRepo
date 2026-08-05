import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AgGridAngular } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, ModuleRegistry, themeQuartz } from 'ag-grid-community';

import { AppHeaderComponent } from '../shared/app-header.component';
import { BackdropCloseDirective } from '../shared/backdrop-close.directive';
import { RoleOption, RoleService } from '../services/role.service';
import { RoleActionsCellRendererComponent } from './role-actions-cell-renderer.component';
import { RoleFormModalComponent } from './role-form-modal/role-form-modal.component';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AgGridAngular, RoleFormModalComponent, BackdropCloseDirective],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.css']
})
export class RolesComponent implements OnInit {
  loading = signal(false);
  quickFilterText = signal('');
  rowData = signal<RoleOption[]>([]);

  formModalOpen = signal(false); // controls the Create/Edit Role modal's visibility
  editingRole = signal<RoleOption | null>(null); // null => Create mode, set => Edit mode

  confirmDeleteOpen = signal(false); // controls the "Are you sure...?" dialog
  rolePendingDelete = signal<RoleOption | null>(null);
  deleting = signal(false); // true while the delete-role API call is in flight
  deleteError = signal<string | null>(null); // set when the delete call fails
  deleteSuccessMessage = signal<string | null>(null); // set on success; shown for 900ms before the dialog closes

  // AG Grid v33+ Theming API - matches the app's blue accent colour (same as Items).
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

  columnDefs: ColDef<RoleOption>[] = [
    {
      colId: 'roleId',
      field: 'roleId',
      headerName: 'Role Id',
      flex: 1,
      minWidth: 110,
      headerClass: 'header-center',
      cellClass: 'cell-center'
    },
    {
      colId: 'roleName',
      field: 'roleName',
      headerName: 'Role Name',
      flex: 2,
      minWidth: 180,
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
      cellRenderer: RoleActionsCellRendererComponent,
      cellRendererParams: {
        onEdit: (role: RoleOption) => this.onEditRole(role),
        onDelete: (role: RoleOption) => this.onDeleteRole(role)
      }
    }
  ];

  constructor(private roleService: RoleService) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  private loadRoles(): void {
    this.loading.set(true);
    this.roleService.getRoles().subscribe({
      next: (roles) => {
        this.loading.set(false);
        this.rowData.set(roles);
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

  onCreateNewRole(): void {
    this.editingRole.set(null);
    this.formModalOpen.set(true);
  }

  onEditRole(role: RoleOption): void {
    this.editingRole.set(role);
    this.formModalOpen.set(true);
  }

  // Covers both a plain Cancel/X (no changes) and Close after a successful save -
  // refreshing on every close is a no-op API call in the former case and the
  // actual point of the latter.
  onFormModalClosed(): void {
    this.formModalOpen.set(false);
    this.editingRole.set(null);
    this.loadRoles();
  }

  onDeleteRole(role: RoleOption): void {
    this.rolePendingDelete.set(role);
    this.deleteError.set(null);
    this.confirmDeleteOpen.set(true);
  }

  // "Yes" in the confirmation dialog - calls DELETE /api/Role/{roleId}. On
  // success the dialog stays open for 900ms showing a success message, then closes
  // and the grid is refreshed from the server.
  onConfirmDeleteYes(): void {
    const role = this.rolePendingDelete();
    if (!role) {
      return;
    }

    this.deleteError.set(null);
    this.deleting.set(true);

    this.roleService.deleteRole(role.roleId).subscribe({
      next: (response) => {
        this.deleting.set(false);
        this.deleteSuccessMessage.set(response?.trim() || 'Role deleted successfully.');

        setTimeout(() => {
          this.confirmDeleteOpen.set(false);
          this.deleteSuccessMessage.set(null);
          this.rolePendingDelete.set(null);
          this.loadRoles();
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
    this.rolePendingDelete.set(null);
    this.deleteError.set(null);
  }

  // deleteRole() uses responseType: 'text', so err.error holds the API's raw
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
    return err.message || 'Failed to delete role. Please try again.';
  }
}

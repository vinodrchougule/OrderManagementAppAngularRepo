import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AgGridAngular } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, ModuleRegistry, themeQuartz } from 'ag-grid-community';

import { AppHeaderComponent } from '../shared/app-header.component';
import { BackdropCloseDirective } from '../shared/backdrop-close.directive';
import { ItemService } from '../services/item.service';
import { ItemOption } from '../manageorders/create-order.model';
import { ItemActionsCellRendererComponent } from './item-actions-cell-renderer.component';
import { ItemFormModalComponent } from './item-form-modal/item-form-modal.component';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AgGridAngular, ItemFormModalComponent, BackdropCloseDirective],
  templateUrl: './items.component.html',
  styleUrls: ['./items.component.css']
})
export class ItemsComponent implements OnInit {
  loading = signal(false);
  quickFilterText = signal('');
  rowData = signal<ItemOption[]>([]);

  formModalOpen = signal(false); // controls the Create/Edit Item modal's visibility
  editingItem = signal<ItemOption | null>(null); // null => Create mode, set => Edit mode

  confirmDeleteOpen = signal(false); // controls the "Are you sure...?" dialog
  itemPendingDelete = signal<ItemOption | null>(null);
  deleting = signal(false); // true while the delete-item API call is in flight
  deleteError = signal<string | null>(null); // set when the delete call fails
  deleteSuccessMessage = signal<string | null>(null); // set on success; shown for 900ms before the dialog closes

  // AG Grid v33+ Theming API - matches the app's blue accent colour (same as Customers).
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

  columnDefs: ColDef<ItemOption>[] = [
    {
      colId: 'itemId',
      field: 'itemId',
      headerName: 'Item Id',
      flex: 1,
      minWidth: 110,
      headerClass: 'header-center',
      cellClass: 'cell-center'
    },
    {
      colId: 'itemName',
      field: 'itemName',
      headerName: 'Item Name',
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
      cellRenderer: ItemActionsCellRendererComponent,
      cellRendererParams: {
        onEdit: (item: ItemOption) => this.onEditItem(item),
        onDelete: (item: ItemOption) => this.onDeleteItem(item)
      }
    }
  ];

  constructor(private itemService: ItemService) {}

  ngOnInit(): void {
    this.loadItems();
  }

  private loadItems(): void {
    this.loading.set(true);
    this.itemService.getItems().subscribe({
      next: (items) => {
        this.loading.set(false);
        this.rowData.set(items);
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

  onCreateNewItem(): void {
    this.editingItem.set(null);
    this.formModalOpen.set(true);
  }

  onEditItem(item: ItemOption): void {
    this.editingItem.set(item);
    this.formModalOpen.set(true);
  }

  // Covers both a plain Cancel/X (no changes) and Close after a successful save -
  // refreshing on every close is a no-op API call in the former case and the
  // actual point of the latter.
  onFormModalClosed(): void {
    this.formModalOpen.set(false);
    this.editingItem.set(null);
    this.loadItems();
  }

  onDeleteItem(item: ItemOption): void {
    this.itemPendingDelete.set(item);
    this.deleteError.set(null);
    this.confirmDeleteOpen.set(true);
  }

  // "Yes" in the confirmation dialog - calls DELETE /api/Item/{itemId}. On
  // success the dialog stays open for 900ms showing a success message, then closes
  // and the grid is refreshed from the server.
  onConfirmDeleteYes(): void {
    const item = this.itemPendingDelete();
    if (!item) {
      return;
    }

    this.deleteError.set(null);
    this.deleting.set(true);

    this.itemService.deleteItem(item.itemId).subscribe({
      next: (response) => {
        this.deleting.set(false);
        this.deleteSuccessMessage.set(response?.trim() || 'Item deleted successfully.');

        setTimeout(() => {
          this.confirmDeleteOpen.set(false);
          this.deleteSuccessMessage.set(null);
          this.itemPendingDelete.set(null);
          this.loadItems();
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
    this.itemPendingDelete.set(null);
    this.deleteError.set(null);
  }

  // deleteItem() uses responseType: 'text', so err.error holds the API's raw
  // response body on failure - it's usually a JSON string like
  // {"status":400,"message":"..."}, so pull out just the message. Fall back to
  // err.message only for network-level failures (e.g. CORS, connection refused)
  // that never reached the server.
  private extractErrorMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string' && err.error.trim().length > 0) {
      try {
        const parsed = JSON.parse(err.error);
        if (parsed && typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
          return parsed.message;
        }
      } catch {
        // Not JSON - fall through and use the raw string as-is.
      }
      return err.error;
    }
    return err.message || 'Failed to delete item. Please try again.';
  }
}

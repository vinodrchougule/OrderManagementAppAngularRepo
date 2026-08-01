import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AgGridAngular } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, ModuleRegistry, themeQuartz } from 'ag-grid-community';

import { AppHeaderComponent } from '../shared/app-header.component';
import { CustomerService } from '../services/customer.service';
import { CustomerOption } from '../manageorders/create-order.model';
import { CustomerActionsCellRendererComponent } from './customer-actions-cell-renderer.component';
import { CustomerFormModalComponent } from './customer-form-modal/customer-form-modal.component';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AgGridAngular, CustomerFormModalComponent],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit {
  loading = signal(false);
  quickFilterText = signal('');
  rowData = signal<CustomerOption[]>([]);

  formModalOpen = signal(false); // controls the Create/Edit Customer modal's visibility
  editingCustomer = signal<CustomerOption | null>(null); // null => Create mode, set => Edit mode

  confirmDeleteOpen = signal(false); // controls the "Are you sure...?" dialog
  customerPendingDelete = signal<CustomerOption | null>(null);
  deleting = signal(false); // true while the delete-customer API call is in flight
  deleteError = signal<string | null>(null); // set when the delete call fails
  deleteSuccessMessage = signal<string | null>(null); // set on success; shown for 900ms before the dialog closes

  // AG Grid v33+ Theming API - matches the app's blue accent colour (same as Manage Orders).
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

  columnDefs: ColDef<CustomerOption>[] = [
    {
      colId: 'customerId',
      field: 'customerId',
      headerName: 'Customer Id',
      flex: 1,
      minWidth: 110,
      headerClass: 'header-center',
      cellClass: 'cell-center'
    },
    {
      colId: 'customerName',
      field: 'customerName',
      headerName: 'Customer Name',
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
      cellRenderer: CustomerActionsCellRendererComponent,
      cellRendererParams: {
        onEdit: (customer: CustomerOption) => this.onEditCustomer(customer),
        onDelete: (customer: CustomerOption) => this.onDeleteCustomer(customer)
      }
    }
  ];

  constructor(private customerService: CustomerService) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  private loadCustomers(): void {
    this.loading.set(true);
    this.customerService.getCustomers().subscribe({
      next: (customers) => {
        this.loading.set(false);
        this.rowData.set(customers);
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

  onCreateNewCustomer(): void {
    this.editingCustomer.set(null);
    this.formModalOpen.set(true);
  }

  onEditCustomer(customer: CustomerOption): void {
    this.editingCustomer.set(customer);
    this.formModalOpen.set(true);
  }

  // Covers both a plain Cancel/X (no changes) and Close after a successful save -
  // refreshing on every close is a no-op API call in the former case and the
  // actual point of the latter.
  onFormModalClosed(): void {
    this.formModalOpen.set(false);
    this.editingCustomer.set(null);
    this.loadCustomers();
  }

  onDeleteCustomer(customer: CustomerOption): void {
    this.customerPendingDelete.set(customer);
    this.deleteError.set(null);
    this.confirmDeleteOpen.set(true);
  }

  // "Yes" in the confirmation dialog - calls DELETE /api/Customer/{customerId}. On
  // success the dialog stays open for 900ms showing a success message, then closes
  // and the grid is refreshed from the server.
  onConfirmDeleteYes(): void {
    const customer = this.customerPendingDelete();
    if (!customer) {
      return;
    }

    this.deleteError.set(null);
    this.deleting.set(true);

    this.customerService.deleteCustomer(customer.customerId).subscribe({
      next: (response) => {
        this.deleting.set(false);
        this.deleteSuccessMessage.set(response?.trim() || 'Customer deleted successfully.');

        setTimeout(() => {
          this.confirmDeleteOpen.set(false);
          this.deleteSuccessMessage.set(null);
          this.customerPendingDelete.set(null);
          this.loadCustomers();
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
    this.customerPendingDelete.set(null);
    this.deleteError.set(null);
  }

  // deleteCustomer() uses responseType: 'text', so err.error holds the API's raw
  // response body on failure - fall back to err.message only for network-level
  // failures (e.g. CORS, connection refused) that never reached the server.
  private extractErrorMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string' && err.error.trim().length > 0) {
      return err.error;
    }
    return err.message || 'Failed to delete customer. Please try again.';
  }
}

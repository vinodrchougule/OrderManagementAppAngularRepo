import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ColDef,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  ModuleRegistry,
  themeQuartz
} from 'ag-grid-community';
import * as XLSX from 'xlsx';

import { AppHeaderComponent } from '../shared/app-header.component';
import { Order, OrderStatus } from './order.model';
import { MOCK_ORDERS } from './manageorders.mock-data';
import { OrderActionsCellRendererComponent } from './order-actions-cell-renderer.component';

// Registers every free Community feature (sorting, filtering, pagination,
// column moving/resizing, row virtualisation, cell renderers, etc.).
ModuleRegistry.registerModules([AllCommunityModule]);

const STATUS_COLORS: Record<OrderStatus, string> = {
  Pending: '#b45309',
  Processing: '#1d4ed8',
  Shipped: '#6d28d9',
  Delivered: '#15803d',
  Cancelled: '#b91c1c'
};

interface ToggleableColumn {
  colId: string;
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-manage-orders',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AgGridAngular],
  templateUrl: './manageorders.component.html',
  styleUrls: ['./manageorders.component.css']
})
export class ManageOrdersComponent {
  rowData: Order[] = [...MOCK_ORDERS];

  loading = signal(false);
  quickFilterText = signal('');
  columnsMenuOpen = signal(false);

  toggleableColumns = signal<ToggleableColumn[]>([
    { colId: 'orderId', label: 'Order Id', visible: true },
    { colId: 'orderDate', label: 'Order Date', visible: true },
    { colId: 'customerId', label: 'Customer Id', visible: true },
    { colId: 'customerName', label: 'Customer Name', visible: true },
    { colId: 'totalAmount', label: 'Total Amount', visible: true },
    { colId: 'status', label: 'Status', visible: true }
  ]);

  // AG Grid v33+ Theming API - matches the app's blue accent colour.
  theme = themeQuartz.withParams({
    accentColor: '#2563eb',
    borderRadius: 6,
    headerFontWeight: 600
  });

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
    minWidth: 110
  };

  columnDefs: ColDef<Order>[] = [
    {
      colId: 'orderId',
      field: 'orderId',
      headerName: 'Order Id',
      filter: 'agNumberColumnFilter',
      minWidth: 120
    },
    {
      colId: 'orderDate',
      field: 'orderDate',
      headerName: 'Order Date',
      minWidth: 140,
      valueFormatter: (params) => (params.value ? new Date(params.value).toLocaleDateString() : '')
    },
    {
      colId: 'customerId',
      field: 'customerId',
      headerName: 'Customer Id',
      filter: 'agNumberColumnFilter',
      minWidth: 130
    },
    {
      colId: 'customerName',
      field: 'customerName',
      headerName: 'Customer Name',
      minWidth: 180
    },
    {
      colId: 'totalAmount',
      field: 'totalAmount',
      headerName: 'Total Amount',
      filter: 'agNumberColumnFilter',
      type: 'rightAligned',
      minWidth: 150,
      valueFormatter: (params) =>
        typeof params.value === 'number'
          ? params.value.toLocaleString('en-IN', {
              style: 'currency',
              currency: 'INR',
              minimumFractionDigits: 2
            })
          : ''
    },
    {
      colId: 'status',
      field: 'status',
      headerName: 'Status',
      minWidth: 140,
      cellRenderer: (params: ICellRendererParams<Order, OrderStatus>) => {
        const value = params.value;
        if (!value) {
          return '';
        }
        const color = STATUS_COLORS[value] ?? '#374151';
        return `<span class="status-badge" style="color:${color}; background-color:${color}1a;">${value}</span>`;
      }
    },
    {
      colId: 'actions',
      headerName: 'Actions',
      minWidth: 130,
      maxWidth: 130,
      sortable: false,
      filter: false,
      resizable: false,
      pinned: 'right',
      cellRenderer: OrderActionsCellRendererComponent
    }
  ];

  private gridApi?: GridApi<Order>;

  onGridReady(event: GridReadyEvent<Order>): void {
    this.gridApi = event.api;
  }

  onQuickFilterInput(value: string): void {
    this.quickFilterText.set(value);
    this.gridApi?.setGridOption('quickFilterText', value);
  }

  toggleColumnsMenu(): void {
    this.columnsMenuOpen.update((open) => !open);
  }

  onToggleColumn(colId: string, visible: boolean): void {
    this.toggleableColumns.update((cols) =>
      cols.map((c) => (c.colId === colId ? { ...c, visible } : c))
    );
    this.gridApi?.setColumnsVisible([colId], visible);
  }

  onRefresh(): void {
    this.loading.set(true);
    // TODO: replace with a real call to the Orders API once it's available
    // (set loading.set(true) before the call, loading.set(false) in next/error,
    // same pattern used in AuthService-backed components elsewhere in this app).
    setTimeout(() => {
      this.rowData = [...MOCK_ORDERS];
      this.loading.set(false);
    }, 700);
  }

  onExportExcel(): void {
    const rows: Order[] = [];
    this.gridApi?.forEachNodeAfterFilterAndSort((node) => {
      if (node.data) {
        rows.push(node.data);
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    XLSX.writeFile(workbook, `orders-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}

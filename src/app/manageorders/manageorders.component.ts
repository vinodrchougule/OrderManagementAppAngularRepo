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
import { OrderActionsCellRendererComponent } from './order-actions-cell-renderer.component';
import { CreateOrderModalComponent } from './create-order-modal/create-order-modal.component'; // Create New Order modal
import { ViewOrderModalComponent } from './view-order-modal/view-order-modal.component'; // View Order modal
import { EditOrderModalComponent } from './edit-order-modal/edit-order-modal.component'; // new Edit Order modal
import { NewOrderPayload } from './create-order.model'; // Create modal's save payload type
import { EditOrderPayload } from './edit-order.model'; // Edit modal's save payload type
import { formatOrderDate } from './order-date.util'; // moved out of this file so the modals can reuse it
import { STATUS_COLORS } from './status-colors.util'; // moved out of this file so the View modal can reuse it

// Registers every free Community feature (sorting, filtering, pagination,
// column moving/resizing, row virtualisation, cell renderers, etc.).
ModuleRegistry.registerModules([AllCommunityModule]);

interface ToggleableColumn {
  colId: string;
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-manage-orders',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AgGridAngular, CreateOrderModalComponent, ViewOrderModalComponent, EditOrderModalComponent], // registers all 3 modals
  templateUrl: './manageorders.component.html',
  styleUrls: ['./manageorders.component.css']
})
export class ManageOrdersComponent {
  rowData: Order[] = [];

  loading = signal(false);
  quickFilterText = signal('');
  columnsMenuOpen = signal(false);
  filterRowVisible = signal(false); // controls the per-column floating filter row
  createOrderModalOpen = signal(false); // controls the Create New Order modal's visibility
  viewOrderModalOpen = signal(false); // controls the View Order modal's visibility
  editOrderModalOpen = signal(false); // controls the Edit Order modal's visibility
  selectedOrder = signal<Order | null>(null); // order currently shown in the View/Edit Order modal

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
    headerFontWeight: 600,
    headerBackgroundColor: '#eef2fb', // header bar background
    chromeBackgroundColor: '#eef2fb' // non-data chrome (incl. the pagination/footer bar) - same colour as the header so they match
  });

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 110
    // floatingFilter is NOT set here - it's applied per-column in buildColumnDefs()
    // below, driven by filterRowVisible(), so the row can be toggled on/off.
  };

  // Built as a method (not a static array) so it can be regenerated with an
  // updated floatingFilter value whenever the Filter button is toggled.
  columnDefs: ColDef<Order>[] = this.buildColumnDefs();

  private gridApi?: GridApi<Order>;

  onGridReady(event: GridReadyEvent<Order>): void {
    this.gridApi = event.api;
  }

  toggleFilterRow(): void {
    this.filterRowVisible.update((visible) => !visible); // flip the toggle state
    this.columnDefs = this.buildColumnDefs(); // rebuild colDefs with new floatingFilter value
    this.gridApi?.setGridOption('columnDefs', this.columnDefs); // push the change into the live grid
  }

  private buildColumnDefs(): ColDef<Order>[] {
    const floatingFilter = this.filterRowVisible(); // read current toggle state

    return [
      {
        colId: 'orderId',
        field: 'orderId',
        headerName: 'Order Id',
        filter: 'agNumberColumnFilter',
        floatingFilter,
        flex: 1,
        minWidth: 100,
        headerClass: 'header-center',
        cellClass: 'cell-center'
      },
      {
        colId: 'orderDate',
        field: 'orderDate',
        headerName: 'Order Date',
        floatingFilter,
        flex: 1,
        minWidth: 110,
        headerClass: 'header-center',
        cellClass: 'cell-center',
        valueFormatter: (params) => formatOrderDate(params.value)
      },
      {
        colId: 'customerId',
        field: 'customerId',
        headerName: 'Customer Id',
        filter: 'agNumberColumnFilter',
        floatingFilter,
        flex: 1,
        minWidth: 110,
        headerClass: 'header-center',
        cellClass: 'cell-center'
      },
      {
        colId: 'customerName',
        field: 'customerName',
        headerName: 'Customer Name',
        floatingFilter,
        flex: 1.4,
        minWidth: 150,
        headerClass: 'header-left',
        cellClass: 'cell-left'
      },
      {
        colId: 'totalAmount',
        field: 'totalAmount',
        headerName: 'Total Amount',
        filter: 'agNumberColumnFilter',
        floatingFilter,
        type: 'rightAligned',
        flex: 1,
        minWidth: 130,
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
        floatingFilter,
        flex: 1,
        minWidth: 110,
        headerClass: 'header-center',
        cellClass: 'cell-center',
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
        minWidth: 90,
        maxWidth: 90,
        sortable: false,
        filter: false,
        resizable: false,
        pinned: 'right',
        headerClass: ['header-center', 'actions-col-bg'], // light tint that complements the header/footer colour
        cellClass: ['cell-center', 'actions-col-bg'],
        cellRenderer: OrderActionsCellRendererComponent,
        cellRendererParams: { onView: (order: Order) => this.onViewOrder(order) } // callback the renderer invokes on click
      }
    ];
  }

  onCreateNewOrder(): void {
    this.createOrderModalOpen.set(true); // open the modal
  }

  onCreateOrderModalClosed(): void {
    this.createOrderModalOpen.set(false); // Cancel/X/backdrop click - discard and close
  }

  onOrderSaved(payload: NewOrderPayload): void {
    // TODO: replace with a real POST to the Orders API once it's available;
    // for now, generate a local id and prepend the new row so it's visible immediately.
    const newOrderId = this.rowData.reduce((max, o) => Math.max(max, o.orderId), 0) + 1;
    const newOrder: Order = {
      orderId: newOrderId,
      orderDate: payload.orderDate,
      customerId: payload.customerId,
      customerName: payload.customerName,
      totalAmount: payload.totalAmount,
      status: 'Pending'
    };
    this.rowData = [newOrder, ...this.rowData]; // prepend so the new order appears first
    this.createOrderModalOpen.set(false); // close the modal (signal write also guarantees the grid re-renders)
  }

  onViewOrder(order: Order): void {
    this.selectedOrder.set(order); // record which order to display
    this.viewOrderModalOpen.set(true); // open the View Order modal
  }

  onViewOrderModalClosed(): void {
    this.viewOrderModalOpen.set(false);
    this.selectedOrder.set(null);
  }

  onEditOrderFromView(order: Order): void {
    this.viewOrderModalOpen.set(false); // hide View Order
    this.selectedOrder.set(order); // keep the order for Edit Order to read
    this.editOrderModalOpen.set(true); // show Edit Order
  }

  onEditOrderModalClosed(): void {
    this.editOrderModalOpen.set(false); // Cancel/X/backdrop click - discard and close
    this.selectedOrder.set(null);
  }

  onOrderEdited(payload: EditOrderPayload): void {
    // TODO: replace with a real PUT/PATCH call to the Orders API once it's available.
    this.rowData = this.rowData.map((o) =>
      o.orderId === payload.orderId
        ? {
            ...o,
            orderDate: payload.orderDate,
            customerId: payload.customerId,
            customerName: payload.customerName,
            totalAmount: payload.totalAmount,
            items: payload.items
          }
        : o
    );
    this.editOrderModalOpen.set(false); // close the modal (signal write also guarantees the grid re-renders)
    this.selectedOrder.set(null);
  }

  onDeleteOrderFromView(order: Order): void {
    // TODO: replace with a real DELETE call to the Orders API once it's available;
    // for now, remove the row locally so the action is visibly demonstrated.
    this.rowData = this.rowData.filter((o) => o.orderId !== order.orderId);
    this.viewOrderModalOpen.set(false); // close the modal (signal write also guarantees the grid re-renders)
    this.selectedOrder.set(null);
  }

  onQuickFilterInput(value: string): void {
    this.quickFilterText.set(value);
    this.gridApi?.setGridOption('quickFilterText', value);
  }

  onClearSearch(): void {
    this.quickFilterText.set(''); // empty the search box
    this.gridApi?.setGridOption('quickFilterText', ''); // drop the active quick filter so hidden rows reappear
    this.onRefresh(); // reload the grid's row data
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
      this.rowData = [];
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

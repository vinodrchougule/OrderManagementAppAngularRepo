import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ColDef,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  IDatasource,
  IGetRowsParams,
  ModuleRegistry,
  PaginationChangedEvent,
  SortModelItem,
  themeQuartz
} from 'ag-grid-community';
import { forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';

import { AppHeaderComponent } from '../shared/app-header.component';
import { Order, OrderStatus } from './order.model';
import { OrderActionsCellRendererComponent } from './order-actions-cell-renderer.component';
import { CreateOrderModalComponent } from './create-order-modal/create-order-modal.component'; // Create New Order modal
import { ViewOrderModalComponent } from './view-order-modal/view-order-modal.component'; // View Order modal
import { EditOrderModalComponent } from './edit-order-modal/edit-order-modal.component'; // new Edit Order modal
import { NewOrderPayload } from './create-order.model'; // Create modal's save payload type
import { formatOrderDate } from './order-date.util'; // moved out of this file so the modals can reuse it
import { STATUS_COLORS } from './status-colors.util'; // moved out of this file so the View modal can reuse it
import { OrderService } from '../services/order.service';

// Registers every free Community feature (sorting, filtering, pagination,
// column moving/resizing, row virtualisation, cell renderers, the infinite
// row model, etc.).
ModuleRegistry.registerModules([AllCommunityModule]);

interface ToggleableColumn {
  colId: string;
  label: string;
  visible: boolean;
}

// GET /api/Order and GET /api/Order/search accept PageNo/PageSize but neither
// supports server-side sort. The grid is wired to the Infinite Row Model so
// pagination (and search) genuinely hit the API for every page, and this
// component fakes sort by applying it to whatever page just came back from
// the API.
const ROW_MODEL_PAGE_SIZE = 10;

@Component({
  selector: 'app-manage-orders',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AgGridAngular, CreateOrderModalComponent, ViewOrderModalComponent, EditOrderModalComponent], // registers all 3 modals
  templateUrl: './manageorders.component.html',
  styleUrls: ['./manageorders.component.css']
})
export class ManageOrdersComponent {
  loading = signal(false);
  quickFilterText = signal('');
  columnsMenuOpen = signal(false);
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
    filter: false,
    resizable: true,
    minWidth: 110
  };

  columnDefs: ColDef<Order>[] = this.buildColumnDefs();

  // Infinite Row Model - the grid calls datasource.getRows() itself on first
  // render and every time the visible page changes, which is what actually
  // drives the GET /api/Order call on load + on every page change.
  rowModelType: 'infinite' = 'infinite';
  paginationPageSize = ROW_MODEL_PAGE_SIZE;
  cacheBlockSize = ROW_MODEL_PAGE_SIZE; // must match paginationPageSize so one block == one page
  datasource: IDatasource = this.buildDatasource();

  private gridApi?: GridApi<Order>;

  constructor(private orderService: OrderService) {}

  onGridReady(event: GridReadyEvent<Order>): void {
    this.gridApi = event.api;
  }

  // Keeps cacheBlockSize in sync when the user picks a different page size from
  // the pagination panel's selector, so each visual page still maps to exactly
  // one API call for exactly that many rows.
  onPaginationChanged(event: PaginationChangedEvent<Order>): void {
    if (!event.newPageSize || !this.gridApi) {
      return;
    }
    const newSize = this.gridApi.paginationGetPageSize();
    if (newSize && newSize !== this.cacheBlockSize) {
      this.cacheBlockSize = newSize;
      this.gridApi.setGridOption('cacheBlockSize', newSize);
    }
  }

  private buildDatasource(): IDatasource {
    return {
      getRows: (params: IGetRowsParams<Order>) => {
        const pageSize = params.endRow - params.startRow;
        const pageNo = Math.floor(params.startRow / pageSize) + 1;
        const searchText = this.quickFilterText().trim();

        const request = searchText
          ? this.orderService.searchOrders(searchText, pageNo, pageSize)
          : this.orderService.getOrders(pageNo, pageSize);

        this.loading.set(true);
        request.subscribe({
          next: (page) => {
            this.loading.set(false);
            const rows = this.applySortModel(page.items, params.sortModel);
            params.successCallback(rows, page.totalCount);
          },
          error: () => {
            this.loading.set(false);
            params.failCallback();
          }
        });
      }
    };
  }

  // Column header sort - same caveat as search: sorts the current page only,
  // since the API has no sort query param to apply it across the full list.
  private applySortModel(rows: Order[], sortModel: SortModelItem[]): Order[] {
    if (!sortModel.length) {
      return rows;
    }
    return [...rows].sort((a, b) => {
      for (const { colId, sort } of sortModel) {
        const aValue = (a as unknown as Record<string, unknown>)[colId];
        const bValue = (b as unknown as Record<string, unknown>)[colId];
        if (aValue === bValue) {
          continue;
        }
        const comparison = aValue! > bValue! ? 1 : -1;
        return sort === 'asc' ? comparison : -comparison;
      }
      return 0;
    });
  }

  private buildColumnDefs(): ColDef<Order>[] {
    return [
      {
        colId: 'orderId',
        field: 'orderId',
        headerName: 'Order Id',
        flex: 1,
        minWidth: 100,
        headerClass: 'header-center',
        cellClass: 'cell-center'
      },
      {
        colId: 'orderDate',
        field: 'orderDate',
        headerName: 'Order Date',
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
        flex: 1,
        minWidth: 110,
        headerClass: 'header-center',
        cellClass: 'cell-center'
      },
      {
        colId: 'customerName',
        field: 'customerName',
        headerName: 'Customer Name',
        flex: 1.4,
        minWidth: 150,
        headerClass: 'header-left',
        cellClass: 'cell-left'
      },
      {
        colId: 'totalAmount',
        field: 'totalAmount',
        headerName: 'Total Amount',
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

  // create-order-modal has already POSTed the order to the API by the time it
  // emits `saved` - just close the modal and re-pull the current page from the
  // server so the grid reflects the real, saved state.
  onOrderSaved(_payload: NewOrderPayload): void {
    this.createOrderModalOpen.set(false);
    this.gridApi?.refreshInfiniteCache();
  }

  // Fetches the full order detail from GET /api/Order/{orderId} rather than reusing the
  // grid row, so the View Order modal always reflects the latest server-side data.
  onViewOrder(order: Order): void {
    this.loading.set(true);
    this.orderService.getOrderById(order.orderId).subscribe({
      next: (fullOrder) => {
        this.loading.set(false);
        this.selectedOrder.set(fullOrder);
        this.viewOrderModalOpen.set(true);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  // Covers both a plain Close/X (no changes) and the view-order-modal's own
  // auto-close after a successful delete - refreshing on every close is a
  // no-op API call in the former case and the actual point of the latter.
  onViewOrderModalClosed(): void {
    this.viewOrderModalOpen.set(false);
    this.selectedOrder.set(null);
    this.gridApi?.refreshInfiniteCache();
  }

  // Re-fetches the order from GET /api/Order/{orderId} rather than reusing the
  // copy View Order already has, so Edit Order always opens on the latest
  // server-side data (e.g. rowVersion) even if it changed since View was opened.
  onEditOrderFromView(order: Order): void {
    this.viewOrderModalOpen.set(false); // hide View Order
    this.loading.set(true);
    this.orderService.getOrderById(order.orderId).subscribe({
      next: (fullOrder) => {
        this.loading.set(false);
        this.selectedOrder.set(fullOrder);
        this.editOrderModalOpen.set(true); // show Edit Order
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  // EditOrderModalComponent saves via its own PUT /api/Order/{orderId} call and
  // shows a success message while staying open - the grid only needs refreshing
  // once the modal actually closes (Cancel/X/backdrop, or Close after a save).
  onEditOrderModalClosed(): void {
    this.editOrderModalOpen.set(false);
    this.selectedOrder.set(null);
    this.gridApi?.refreshInfiniteCache();
  }

  // Re-queries the API (GET /api/Order/search once searchText is non-empty,
  // GET /api/Order once it's cleared) and jumps back to page 1, since a new
  // search's result set may be smaller than whatever page was showing.
  onQuickFilterInput(value: string): void {
    this.quickFilterText.set(value);
    this.gridApi?.paginationGoToFirstPage();
    this.gridApi?.refreshInfiniteCache();
  }

  onClearSearch(): void {
    this.quickFilterText.set(''); // empty the search box
    this.gridApi?.paginationGoToFirstPage();
    this.gridApi?.refreshInfiniteCache();
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

  // Exports the full order list, not just the currently-loaded grid page -
  // pages through the API (capped at the backend's max page size of 100)
  // until every order has been fetched.
  onExportExcel(): void {
    this.loading.set(true);
    const pageSize = 100;

    this.orderService.getOrders(1, pageSize).subscribe({
      next: (firstPage) => {
        const totalPages = Math.max(1, Math.ceil(firstPage.totalCount / pageSize));
        if (totalPages <= 1) {
          this.writeExcel(firstPage.items);
          return;
        }

        const remainingPageNos = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        forkJoin(remainingPageNos.map((pageNo) => this.orderService.getOrders(pageNo, pageSize))).subscribe({
          next: (remainingPages) => {
            const allItems = [firstPage.items, ...remainingPages.map((p) => p.items)].flat();
            this.writeExcel(allItems);
          },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }

  private writeExcel(rows: Order[]): void {
    this.loading.set(false);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    XLSX.writeFile(workbook, `orders-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}

import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

import { Order } from './order.model';

/** Extra params passed via colDef.cellRendererParams so this renderer can call back into the grid component. */
interface OrderActionsParams extends ICellRendererParams<Order> {
  onView?: (order: Order) => void;
}

/** Renders the View action button inside the "Actions" column. */
@Component({
  selector: 'app-order-actions-cell-renderer',
  standalone: true,
  template: `
    <div class="row-actions">
      <button type="button" class="action-btn view" title="View" (click)="onView()"><i class="bi bi-eye-fill icon-blue" aria-hidden="true"></i></button>
    </div>
  `,
  styles: [
    `
      .row-actions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        height: 100%;
      }

      .action-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        padding: 0;
        font-size: 13px;
        line-height: 1;
        border: 1px solid #d1d5db;
        border-radius: 5px;
        background-color: #ffffff;
        cursor: pointer;
        transition: background-color 0.15s ease, border-color 0.15s ease;
      }

      .action-btn:hover {
        background-color: #f0f4fd;
        border-color: #2563eb;
      }
    `
  ]
})
export class OrderActionsCellRendererComponent implements ICellRendererAngularComp {
  private data!: Order;
  private params!: OrderActionsParams;

  agInit(params: OrderActionsParams): void {
    this.params = params;
    this.data = params.data as Order;
  }

  refresh(params: OrderActionsParams): boolean {
    this.params = params;
    this.data = params.data as Order;
    return true;
  }

  onView(): void {
    this.params.onView?.(this.data); // delegate to ManageOrdersComponent.onViewOrder() via cellRendererParams
  }
}

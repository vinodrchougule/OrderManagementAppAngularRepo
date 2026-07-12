import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

import { Order } from './order.model';

/**
 * Renders the View action button inside the "Actions" column.
 * TODO: wire this up to real navigation once the order details view exists.
 */
@Component({
  selector: 'app-order-actions-cell-renderer',
  standalone: true,
  template: `
    <div class="row-actions">
      <button type="button" class="action-btn view" title="View" (click)="onView()">👁</button>
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

  agInit(params: ICellRendererParams<Order>): void {
    this.data = params.data as Order;
  }

  refresh(params: ICellRendererParams<Order>): boolean {
    this.data = params.data as Order;
    return true;
  }

  onView(): void {
    // TODO: navigate to order details once that view exists.
    console.log('View order', this.data.orderId);
  }
}

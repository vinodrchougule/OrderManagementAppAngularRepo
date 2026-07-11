import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

import { Order } from './order.model';

/**
 * Renders View / Edit / Delete action buttons inside the "Actions" column.
 * TODO: wire these up to real navigation/API calls once the Orders API is available.
 */
@Component({
  selector: 'app-order-actions-cell-renderer',
  standalone: true,
  template: `
    <div class="row-actions">
      <button type="button" class="action-btn view" title="View" (click)="onView()">👁</button>
      <button type="button" class="action-btn edit" title="Edit" (click)="onEdit()">✎</button>
      <button type="button" class="action-btn delete" title="Delete" (click)="onDelete()">🗑</button>
    </div>
  `,
  styles: [
    `
      .row-actions {
        display: flex;
        align-items: center;
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

      .action-btn.delete:hover {
        background-color: #fee2e2;
        border-color: #dc2626;
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

  onEdit(): void {
    // TODO: navigate to edit order once that view exists.
    console.log('Edit order', this.data.orderId);
  }

  onDelete(): void {
    // TODO: call the delete order API once available.
    console.log('Delete order', this.data.orderId);
  }
}

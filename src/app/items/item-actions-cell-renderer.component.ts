import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

import { ItemOption } from '../manageorders/create-order.model';

/** Extra params passed via colDef.cellRendererParams so this renderer can call back into ItemsComponent. */
interface ItemActionsParams extends ICellRendererParams<ItemOption> {
  onEdit?: (item: ItemOption) => void;
  onDelete?: (item: ItemOption) => void;
}

/** Renders the Edit/Delete action buttons inside the "Actions" column. */
@Component({
  selector: 'app-item-actions-cell-renderer',
  standalone: true,
  template: `
    <div class="row-actions">
      <button type="button" class="action-btn edit" title="Edit" (click)="onEdit()">✎</button>
      <button type="button" class="action-btn delete" title="Delete" (click)="onDelete()">🗑</button>
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

      .action-btn.edit:hover {
        background-color: #f0f4fd;
        border-color: #2563eb;
      }

      .action-btn.delete:hover {
        background-color: #fef2f2;
        border-color: #dc2626;
      }
    `
  ]
})
export class ItemActionsCellRendererComponent implements ICellRendererAngularComp {
  private data!: ItemOption;
  private params!: ItemActionsParams;

  agInit(params: ItemActionsParams): void {
    this.params = params;
    this.data = params.data as ItemOption;
  }

  refresh(params: ItemActionsParams): boolean {
    this.params = params;
    this.data = params.data as ItemOption;
    return true;
  }

  onEdit(): void {
    this.params.onEdit?.(this.data);
  }

  onDelete(): void {
    this.params.onDelete?.(this.data);
  }
}

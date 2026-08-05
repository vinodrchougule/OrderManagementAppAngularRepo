import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

import { RoleOption } from '../services/role.service';

/** Extra params passed via colDef.cellRendererParams so this renderer can call back into RolesComponent. */
interface RoleActionsParams extends ICellRendererParams<RoleOption> {
  onEdit?: (role: RoleOption) => void;
  onDelete?: (role: RoleOption) => void;
}

/** Renders the Edit/Delete action buttons inside the "Actions" column. */
@Component({
  selector: 'app-role-actions-cell-renderer',
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
export class RoleActionsCellRendererComponent implements ICellRendererAngularComp {
  private data!: RoleOption;
  private params!: RoleActionsParams;

  agInit(params: RoleActionsParams): void {
    this.params = params;
    this.data = params.data as RoleOption;
  }

  refresh(params: RoleActionsParams): boolean {
    this.params = params;
    this.data = params.data as RoleOption;
    return true;
  }

  onEdit(): void {
    this.params.onEdit?.(this.data);
  }

  onDelete(): void {
    this.params.onDelete?.(this.data);
  }
}

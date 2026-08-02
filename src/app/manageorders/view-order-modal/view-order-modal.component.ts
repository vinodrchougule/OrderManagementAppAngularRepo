import { Component, EventEmitter, Input, Output, signal } from '@angular/core'; // signal re-added for the delete-confirmation dialog
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import { Order } from '../order.model';
import { formatOrderDate } from '../order-date.util';
import { STATUS_COLORS } from '../status-colors.util';
import { DraggableModalDirective } from '../../shared/draggable-modal.directive'; // shared, reusable drag behaviour
import { BackdropCloseDirective } from '../../shared/backdrop-close.directive';
import { OrderService } from '../../services/order.service';

/**
 * "View Order" modal - read-only order summary + Item Details grid, with
 * Edit Order / Delete Order / Close actions in the footer. Draggable via its
 * header bar, same visual language (header/footer colour, drag behaviour) as
 * CreateOrderModalComponent. Delete Order asks for Yes/No confirmation, then on
 * success stays open for 900ms showing a success message before emitting
 * `closed` - the parent refreshes the grid whenever this modal closes.
 */
@Component({
  selector: 'app-view-order-modal',
  standalone: true,
  imports: [CommonModule, DraggableModalDirective, BackdropCloseDirective],
  templateUrl: './view-order-modal.component.html',
  styleUrls: ['./view-order-modal.component.css']
})
export class ViewOrderModalComponent {
  @Input({ required: true }) order!: Order;

  @Output() closed = new EventEmitter<void>();
  @Output() editOrder = new EventEmitter<Order>();

  confirmDeleteOpen = signal(false); // controls the "Are you sure...?" dialog
  deleting = signal(false); // true while the delete-order API call is in flight
  deleteError = signal<string | null>(null); // set when the delete call fails
  deleteSuccessMessage = signal<string | null>(null); // set on success; shown for 900ms before the modal closes

  statusColors = STATUS_COLORS;
  formatOrderDate = formatOrderDate; // exposed for use in the template

  constructor(private orderService: OrderService) {}

  onEdit(): void {
    this.editOrder.emit(this.order);
  }

  // "Delete Order" no longer deletes directly - it opens the confirmation dialog.
  onDeleteClick(): void {
    this.deleteError.set(null);
    this.confirmDeleteOpen.set(true);
  }

  // "Yes" in the confirmation dialog - calls DELETE /api/Order/{orderId}. On success
  // the modal stays open for 900ms showing a success message (same pattern as
  // CreateOrderModalComponent's save flow), then emits `closed` so the parent hides
  // this modal and refreshes the grid.
  onConfirmDeleteYes(): void {
    this.deleteError.set(null);
    this.deleting.set(true);

    this.orderService.deleteOrder(this.order.orderId).subscribe({
      next: (response) => {
        this.deleting.set(false);
        this.deleteSuccessMessage.set(response?.trim() || 'Order deleted successfully.');

        setTimeout(() => {
          this.confirmDeleteOpen.set(false);
          this.deleteSuccessMessage.set(null);
          this.closed.emit();
        }, 900);
      },
      error: (err: HttpErrorResponse) => {
        this.deleting.set(false);
        this.deleteError.set(this.extractErrorMessage(err));
      }
    });
  }

  // "No" (or backdrop click) - dismiss the dialog, no changes. Disabled while a
  // delete is in flight or its success message is showing (see the template).
  onConfirmDeleteNo(): void {
    this.confirmDeleteOpen.set(false);
    this.deleteError.set(null);
  }

  // deleteOrder() uses responseType: 'text', so err.error holds the API's raw
  // response body on failure - fall back to err.message only for network-level
  // failures (e.g. CORS, connection refused) that never reached the server.
  private extractErrorMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string' && err.error.trim().length > 0) {
      return err.error;
    }
    return err.message || 'Failed to delete order. Please try again.';
  }

  onClose(): void {
    this.closed.emit();
  }
}

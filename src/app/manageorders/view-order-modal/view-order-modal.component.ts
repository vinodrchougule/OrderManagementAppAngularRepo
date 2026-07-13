import { Component, EventEmitter, Input, Output, signal } from '@angular/core'; // signal re-added for the delete-confirmation dialog
import { CommonModule } from '@angular/common';

import { Order } from '../order.model';
import { formatOrderDate } from '../order-date.util';
import { STATUS_COLORS } from '../status-colors.util';
import { DraggableModalDirective } from '../../shared/draggable-modal.directive'; // shared, reusable drag behaviour

/**
 * "View Order" modal - read-only order summary + Item Details grid, with
 * Edit Order / Delete Order / Close actions in the footer. Draggable via its
 * header bar, same visual language (header/footer colour, drag behaviour) as
 * CreateOrderModalComponent. Delete Order asks for Yes/No confirmation before
 * emitting `deleteOrder`.
 */
@Component({
  selector: 'app-view-order-modal',
  standalone: true,
  imports: [CommonModule, DraggableModalDirective],
  templateUrl: './view-order-modal.component.html',
  styleUrls: ['./view-order-modal.component.css']
})
export class ViewOrderModalComponent {
  @Input({ required: true }) order!: Order;

  @Output() closed = new EventEmitter<void>();
  @Output() editOrder = new EventEmitter<Order>();
  @Output() deleteOrder = new EventEmitter<Order>();

  confirmDeleteOpen = signal(false); // controls the "Are you sure...?" dialog

  statusColors = STATUS_COLORS;
  formatOrderDate = formatOrderDate; // exposed for use in the template

  onEdit(): void {
    this.editOrder.emit(this.order);
  }

  // "Delete Order" no longer deletes directly - it opens the confirmation dialog.
  onDeleteClick(): void {
    this.confirmDeleteOpen.set(true);
  }

  // "Yes" in the confirmation dialog - actually deletes.
  onConfirmDeleteYes(): void {
    this.confirmDeleteOpen.set(false);
    this.deleteOrder.emit(this.order);
  }

  // "No" (or backdrop click) - dismiss the dialog, no changes.
  onConfirmDeleteNo(): void {
    this.confirmDeleteOpen.set(false);
  }

  onClose(): void {
    this.closed.emit();
  }
}

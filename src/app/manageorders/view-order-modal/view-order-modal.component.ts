import { Component, EventEmitter, Input, Output } from '@angular/core'; // OnDestroy/signal no longer needed - drag moved to DraggableModalDirective
import { CommonModule } from '@angular/common';

import { Order } from '../order.model';
import { formatOrderDate } from '../order-date.util';
import { STATUS_COLORS } from '../status-colors.util';
import { DraggableModalDirective } from '../../shared/draggable-modal.directive'; // shared, reusable drag behaviour

/**
 * "View Order" modal - read-only order summary + Item Details grid, with
 * Edit Order / Delete Order / Close actions in the footer. Draggable via its
 * header bar, same visual language (header/footer colour, drag behaviour) as
 * CreateOrderModalComponent.
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

  statusColors = STATUS_COLORS;
  formatOrderDate = formatOrderDate; // exposed for use in the template

  onEdit(): void {
    this.editOrder.emit(this.order);
  }

  onDelete(): void {
    this.deleteOrder.emit(this.order);
  }

  onClose(): void {
    this.closed.emit();
  }
}

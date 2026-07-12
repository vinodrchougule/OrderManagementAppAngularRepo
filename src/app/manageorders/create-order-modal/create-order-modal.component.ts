import { Component, EventEmitter, OnDestroy, Output, computed, signal } from '@angular/core'; // OnDestroy added for drag-listener cleanup
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  CUSTOMER_OPTIONS,
  CustomerOption,
  ITEM_OPTIONS,
  ItemOption,
  NewOrderPayload,
  OrderLineItem
} from '../create-order.model';
import { formatOrderDate, todayIsoDate } from '../order-date.util';

/**
 * "Create New Order" modal. Header fields (Order Date, Customer, Total Amount)
 * plus a repeatable item-entry row that appends to an order-items table.
 * Emits `saved` with the assembled order, or `closed` on Cancel/backdrop/X.
 */
@Component({
  selector: 'app-create-order-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-order-modal.component.html',
  styleUrls: ['./create-order-modal.component.css']
})
export class CreateOrderModalComponent implements OnDestroy {
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<NewOrderPayload>();

  // Draggable modal-card offset (translate x/y in px from its centered rest position).
  dragOffset = signal({ x: 0, y: 0 });
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private offsetStart = { x: 0, y: 0 };

  customerOptions: CustomerOption[] = CUSTOMER_OPTIONS;
  itemOptions: ItemOption[] = ITEM_OPTIONS;

  // Order Date is read-only/display-only, so it isn't a form control.
  todayIso = todayIsoDate();
  todayDisplay = formatOrderDate(this.todayIso);

  headerForm: FormGroup;
  itemForm: FormGroup;

  lineItems = signal<OrderLineItem[]>([]);
  itemFormSubmitted = signal(false); // gates item-row validation messages until first Add Item attempt
  headerSubmitted = signal(false); // gates header validation + "add at least one item" message until Save attempt

  totalAmount = computed(() =>
    this.lineItems().reduce((sum, item) => sum + item.lineTotal, 0)
  );

  constructor(private fb: FormBuilder) {
    this.headerForm = this.fb.group({
      customerId: ['', Validators.required]
    });

    this.itemForm = this.fb.group({
      itemId: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]], // required positive integer
      unitPrice: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/), Validators.min(0.01)]] // up to 2 decimals
    });
  }

  get hf() {
    return this.headerForm.controls;
  }

  get itf() {
    return this.itemForm.controls;
  }

  private customerName(customerId: number): string {
    return this.customerOptions.find((c) => c.customerId === customerId)?.customerName ?? '';
  }

  private itemName(itemId: number): string {
    return this.itemOptions.find((i) => i.itemId === itemId)?.itemName ?? '';
  }

  onAddItem(): void {
    this.itemFormSubmitted.set(true);
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    const itemId = Number(this.itemForm.value.itemId);
    const quantity = Number(this.itemForm.value.quantity);
    const unitPrice = Number(this.itemForm.value.unitPrice);
    const lineTotal = Math.round(quantity * unitPrice * 100) / 100;

    this.lineItems.update((items) => [
      ...items,
      { itemId, itemName: this.itemName(itemId), quantity, unitPrice, lineTotal }
    ]);

    this.itemForm.reset();
    this.itemFormSubmitted.set(false);
  }

  onRemoveItem(index: number): void {
    this.lineItems.update((items) => items.filter((_, i) => i !== index));
  }

  onSave(): void {
    this.headerSubmitted.set(true);
    this.headerForm.markAllAsTouched();

    if (this.headerForm.invalid || this.lineItems().length === 0) {
      return;
    }

    const customerId = Number(this.headerForm.value.customerId);

    this.saved.emit({
      orderDate: this.todayIso,
      customerId,
      customerName: this.customerName(customerId),
      totalAmount: this.totalAmount(),
      items: this.lineItems()
    });
  }

  onCancel(): void {
    this.closed.emit();
  }

  // Starts a drag when the header bar (not the close button) is pressed.
  onHeaderMouseDown(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('.icon-close-btn')) {
      return; // don't start a drag when clicking the X button
    }
    this.isDragging = true;
    this.dragStart = { x: event.clientX, y: event.clientY };
    this.offsetStart = { ...this.dragOffset() };
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    event.preventDefault(); // avoid text selection while dragging
  }

  // Arrow-function class fields so `this` and the listener reference stay stable
  // for addEventListener/removeEventListener.
  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging) {
      return;
    }
    const dx = event.clientX - this.dragStart.x;
    const dy = event.clientY - this.dragStart.y;
    this.dragOffset.set({ x: this.offsetStart.x + dx, y: this.offsetStart.y + dy }); // signal write - triggers re-render in this zoneless app
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };

  ngOnDestroy(): void {
    // safety net in case the modal is destroyed mid-drag
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
}

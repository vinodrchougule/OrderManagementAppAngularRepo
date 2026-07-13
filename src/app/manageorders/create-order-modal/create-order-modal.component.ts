import { Component, EventEmitter, Output, computed, signal } from '@angular/core'; // OnDestroy no longer needed - drag moved to DraggableModalDirective
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  CUSTOMER_OPTIONS,
  CustomerOption,
  ITEM_OPTIONS,
  ItemOption,
  NewOrderPayload
} from '../create-order.model';
import { OrderLineItem } from '../order.model'; // moved to order.model.ts so View Order can reuse it
import { formatOrderDate, todayIsoDate } from '../order-date.util';
import { DraggableModalDirective } from '../../shared/draggable-modal.directive'; // shared, reusable drag behaviour

/**
 * "Create New Order" modal. Header fields (Order Date, Customer, Total Amount)
 * plus a repeatable item-entry row that appends to an order-items table.
 * Emits `saved` with the assembled order, or `closed` on Cancel/backdrop/X.
 */
@Component({
  selector: 'app-create-order-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DraggableModalDirective],
  templateUrl: './create-order-modal.component.html',
  styleUrls: ['./create-order-modal.component.css']
})
export class CreateOrderModalComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<NewOrderPayload>();

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
}

import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { Order, OrderLineItem } from '../order.model';
import { CUSTOMER_OPTIONS, CustomerOption, ITEM_OPTIONS, ItemOption } from '../create-order.model';
import { EditOrderPayload } from '../edit-order.model';
import { formatOrderDate } from '../order-date.util'; // dd-Mon-yyyy display formatting
import { DraggableModalDirective } from '../../shared/draggable-modal.directive'; // shared, reusable drag behaviour

/**
 * "Edit Order" modal. Order Id/Total Amount/Status are read-only; Order Date
 * (native date picker, displayed as dd-Mon-yyyy) and Customer Name are editable.
 * An item-entry row above the grid adds new lines; existing/new lines can be
 * removed. Total Amount recomputes live from the remaining lines, and Save
 * Changes is blocked unless Customer Name, Order Date, and at least one item
 * are present. Emits `saved` on Save Changes, `closed` on Cancel/X.
 */
@Component({
  selector: 'app-edit-order-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DraggableModalDirective],
  templateUrl: './edit-order-modal.component.html',
  styleUrls: ['./edit-order-modal.component.css']
})
export class EditOrderModalComponent implements OnInit {
  @Input({ required: true }) order!: Order;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<EditOrderPayload>();

  // Native <input type="date"> used only to drive the browser's calendar picker.
  @ViewChild('dateInput') dateInputRef?: ElementRef<HTMLInputElement>;

  customerOptions: CustomerOption[] = CUSTOMER_OPTIONS;
  itemOptions: ItemOption[] = ITEM_OPTIONS;

  // Order Date is kept as its own signal (not a form control) so we can show
  // it formatted as dd-Mon-yyyy while a hidden native date input supplies the
  // calendar picker and the real ISO value.
  orderDateIso = signal('');
  orderDateDisplay = computed(() => formatOrderDate(this.orderDateIso()));

  editForm: FormGroup; // customerId only - see orderDateIso above for Order Date
  itemForm: FormGroup; // the "add item" row above the items table

  items = signal<OrderLineItem[]>([]);
  submitted = signal(false); // gates Order Date/Customer Name/"no items" messages until Save Changes is pressed
  itemFormSubmitted = signal(false); // gates item-row validation messages until Add Item is pressed

  totalAmount = computed(() => this.items().reduce((sum, item) => sum + item.lineTotal, 0));

  constructor(private fb: FormBuilder) {
    this.editForm = this.fb.group({
      customerId: ['', Validators.required]
    });

    this.itemForm = this.fb.group({
      itemId: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]], // required positive integer
      unitPrice: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/), Validators.min(0.01)]] // up to 2 decimals
    });
  }

  ngOnInit(): void {
    // If the order's current customer isn't one of the hardcoded CUSTOMER_OPTIONS
    // (mock orders use real-looking customers beyond the 2 test ones), add it so
    // the dropdown has a matching option and actually shows the customer's name.
    const hasCurrentCustomer = CUSTOMER_OPTIONS.some((c) => c.customerId === this.order.customerId);
    this.customerOptions = hasCurrentCustomer
      ? CUSTOMER_OPTIONS
      : [{ customerId: this.order.customerId, customerName: this.order.customerName }, ...CUSTOMER_OPTIONS];

    // Seed the editable fields and item list from the order passed in.
    this.orderDateIso.set(this.order.orderDate);
    this.editForm.setValue({ customerId: this.order.customerId });
    this.items.set(this.order.items ? [...this.order.items] : []);
  }

  get f() {
    return this.editForm.controls;
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

    // No orderItemId - this line isn't persisted yet (shows as "—" in the grid until saved).
    this.items.update((items) => [
      ...items,
      { itemId, itemName: this.itemName(itemId), quantity, unitPrice, lineTotal }
    ]);

    this.itemForm.reset();
    this.itemFormSubmitted.set(false);
  }

  onOrderDateChange(value: string): void {
    this.orderDateIso.set(value);
  }

  // Opens the native calendar picker on the hidden date input.
  openDatePicker(): void {
    const el = this.dateInputRef?.nativeElement;
    if (!el) {
      return;
    }
    const picker = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
    } else {
      el.focus();
      el.click();
    }
  }

  onRemoveItem(index: number): void {
    this.items.update((items) => items.filter((_, i) => i !== index));
  }

  onSave(): void {
    this.submitted.set(true);
    this.editForm.markAllAsTouched();

    // Blocked if Customer Name is empty, Order Date is empty, or there are no order items.
    if (this.editForm.invalid || !this.orderDateIso() || this.items().length === 0) {
      return;
    }

    const customerId = Number(this.editForm.value.customerId);

    this.saved.emit({
      orderId: this.order.orderId,
      orderDate: this.orderDateIso(),
      customerId,
      customerName: this.customerName(customerId),
      totalAmount: this.totalAmount(),
      status: this.order.status, // read-only in this modal
      items: this.items()
    });
  }

  onCancel(): void {
    this.closed.emit();
  }
}

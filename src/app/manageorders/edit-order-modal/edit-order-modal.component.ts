import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { Order, OrderLineItem, OrderStatus } from '../order.model';
import { CUSTOMER_OPTIONS, CustomerOption, ITEM_OPTIONS, ItemOption } from '../create-order.model';
import { formatOrderDate } from '../order-date.util'; // dd-Mon-yyyy display formatting
import { STATUS_COLORS } from '../status-colors.util'; // its keys double as the Status dropdown's options
import { DraggableModalDirective } from '../../shared/draggable-modal.directive'; // shared, reusable drag behaviour
import { OrderService, UpdateOrderRequest } from '../../services/order.service';

/**
 * "Edit Order" modal. Every field except Order Id can be edited - Order Date
 * (native date picker, displayed as dd-Mon-yyyy), Customer Name, Status, and
 * the item lines (add/remove); Total Amount stays read-only since it's derived
 * from the item lines rather than something the user enters directly. Save
 * Changes calls PUT /api/Order/{orderId} itself and shows the result inline;
 * on success the modal stays open with a success message until the user
 * closes it - the parent refreshes the grid on `closed`, not on save.
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

  // Native <input type="date"> used only to drive the browser's calendar picker.
  @ViewChild('dateInput') dateInputRef?: ElementRef<HTMLInputElement>;

  customerOptions: CustomerOption[] = CUSTOMER_OPTIONS;
  itemOptions: ItemOption[] = ITEM_OPTIONS;
  statusOptions: OrderStatus[] = Object.keys(STATUS_COLORS) as OrderStatus[];

  // Order Date is kept as its own signal (not a form control) so we can show
  // it formatted as dd-Mon-yyyy while a hidden native date input supplies the
  // calendar picker and the real ISO value.
  orderDateIso = signal('');
  orderDateDisplay = computed(() => formatOrderDate(this.orderDateIso()));

  editForm: FormGroup; // customerId, status - see orderDateIso above for Order Date
  itemForm: FormGroup; // the "add item" row above the items table

  items = signal<OrderLineItem[]>([]);
  submitted = signal(false); // gates Order Date/Customer Name/"no items" messages until Save Changes is pressed
  itemFormSubmitted = signal(false); // gates item-row validation messages until Add Item is pressed

  saving = signal(false); // true while the update-order API call is in flight
  saveError = signal<string | null>(null); // set when the API call fails
  saveSuccessMessage = signal<string | null>(null); // set on success; modal stays open until the user closes it

  totalAmount = computed(() => this.items().reduce((sum, item) => sum + item.lineTotal, 0));

  constructor(private fb: FormBuilder, private orderService: OrderService) {
    this.editForm = this.fb.group({
      customerId: ['', Validators.required],
      status: ['', Validators.required]
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
    this.editForm.setValue({ customerId: this.order.customerId, status: this.order.status });
    this.items.set(this.order.items ? [...this.order.items] : []);
  }

  get f() {
    return this.editForm.controls;
  }

  get itf() {
    return this.itemForm.controls;
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

    // Blocked if Customer Name/Status is empty, Order Date is empty, or there are no order items.
    if (this.editForm.invalid || !this.orderDateIso() || this.items().length === 0) {
      return;
    }

    const payload: UpdateOrderRequest = {
      orderId: this.order.orderId,
      orderDate: this.orderDateIso(),
      customerId: Number(this.editForm.value.customerId),
      status: this.statusOptions.indexOf(this.editForm.value.status), // enum's numeric value - see UpdateOrderRequest.status
      rowVersion: this.order.rowVersion,
      orderItems: this.items().map((item) => ({
        orderItemId: item.orderItemId,
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    };

    this.saveError.set(null);
    this.saveSuccessMessage.set(null);
    this.saving.set(true);

    this.orderService.updateOrder(this.order.orderId, payload).subscribe({
      next: () => {
        this.saving.set(false);
        // A 200 response means the update succeeded - show this fixed message
        // regardless of the API's raw response body. Modal stays open showing
        // it; the parent only refreshes once the user closes the modal (see
        // (closed) handler in ManageOrdersComponent).
        this.saveSuccessMessage.set('Order updated successfully');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.saveError.set(this.extractErrorMessage(err));
      }
    });
  }

  onCancel(): void {
    this.closed.emit();
  }

  // updateOrder() uses responseType: 'text', so err.error holds the API's raw
  // response body on failure - fall back to err.message only for network-level
  // failures (e.g. CORS, connection refused) that never reached the server.
  private extractErrorMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string' && err.error.trim().length > 0) {
      return err.error;
    }
    return err.message || 'Failed to save order. Please try again.';
  }
}

import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { Order, OrderLineItem, OrderStatus } from '../order.model';
import { CustomerOption, ItemOption } from '../create-order.model';
import { formatOrderDate } from '../order-date.util'; // dd-Mon-yyyy display formatting
import { STATUS_COLORS } from '../status-colors.util'; // its keys double as the Status dropdown's options
import { DraggableModalDirective } from '../../shared/draggable-modal.directive'; // shared, reusable drag behaviour
import { BackdropCloseDirective } from '../../shared/backdrop-close.directive';
import { OrderService, UpdateOrderRequest } from '../../services/order.service';
import { CustomerService } from '../../services/customer.service';
import { ItemService } from '../../services/item.service';

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
  imports: [CommonModule, ReactiveFormsModule, DraggableModalDirective, BackdropCloseDirective],
  templateUrl: './edit-order-modal.component.html',
  styleUrls: ['./edit-order-modal.component.css']
})
export class EditOrderModalComponent implements OnInit {
  @Input({ required: true }) order!: Order;

  @Output() closed = new EventEmitter<void>();

  // Native <input type="date"> used only to drive the browser's calendar picker.
  @ViewChild('dateInput') dateInputRef?: ElementRef<HTMLInputElement>;

  customerOptions: CustomerOption[] = [];
  customersLoading = signal(false);
  customersError = signal<string | null>(null);

  itemOptions: ItemOption[] = [];
  itemsLoading = signal(false);
  itemsError = signal<string | null>(null);

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

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private customerService: CustomerService,
    private itemService: ItemService
  ) {
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
    this.customersLoading.set(true);
    this.customerService.getCustomers().subscribe({
      next: (customers) => {
        // If the order's current customer isn't in the fetched list (e.g. mock
        // orders using a customer that's since been removed), add it so the
        // dropdown has a matching option and actually shows the customer's name.
        const hasCurrentCustomer = customers.some((c) => c.customerId === this.order.customerId);
        this.customerOptions = hasCurrentCustomer
          ? customers
          : [{ customerId: this.order.customerId, customerName: this.order.customerName }, ...customers];
        this.customersLoading.set(false);
      },
      error: () => {
        this.customersError.set('Failed to load customers. Please try again.');
        this.customerOptions = [{ customerId: this.order.customerId, customerName: this.order.customerName }];
        this.customersLoading.set(false);
      }
    });

    this.itemsLoading.set(true);
    this.itemService.getItems().subscribe({
      next: (items) => {
        this.itemOptions = items;
        this.itemsLoading.set(false);
      },
      error: () => {
        this.itemsError.set('Failed to load items. Please try again.');
        this.itemsLoading.set(false);
      }
    });

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
  // response body as a string - which for validation failures is itself a JSON object
  // (e.g. {"status":400,"message":"Validation failed","errors":[{"Key":"CustomerId","Value":["CustomerId is required."]}]}),
  // so pull out the actual per-field messages rather than showing the whole blob or
  // just the generic "message" wrapper text. Falls back to the raw string, then
  // err.message, for shapes that aren't that JSON envelope (e.g. network-level
  // failures that never reached the server).
  private extractErrorMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string' && err.error.trim().length > 0) {
      try {
        const parsed = JSON.parse(err.error);
        if (Array.isArray(parsed?.errors) && parsed.errors.length > 0) {
          const messages = parsed.errors
            .flatMap((e: any) => (Array.isArray(e?.Value) ? e.Value : []))
            .filter((m: any) => typeof m === 'string' && m.trim().length > 0);
          if (messages.length > 0) {
            return messages.join(' ');
          }
        }
        if (parsed && typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
          return parsed.message;
        }
      } catch {
        // not JSON - fall through and show the raw string
      }
      return err.error;
    }
    return err.message || 'Failed to save order. Please try again.';
  }
}

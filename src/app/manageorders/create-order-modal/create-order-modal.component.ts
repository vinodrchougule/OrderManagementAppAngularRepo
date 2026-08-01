import { Component, EventEmitter, OnInit, Output, computed, signal } from '@angular/core'; // OnDestroy no longer needed - drag moved to DraggableModalDirective
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import {
  CustomerOption,
  ITEM_OPTIONS,
  ItemOption,
  NewOrderPayload
} from '../create-order.model';
import { OrderLineItem } from '../order.model'; // moved to order.model.ts so View Order can reuse it
import { formatOrderDate, todayIsoDate } from '../order-date.util';
import { DraggableModalDirective } from '../../shared/draggable-modal.directive'; // shared, reusable drag behaviour
import { OrderService } from '../../services/order.service';
import { CustomerService } from '../../services/customer.service';

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
export class CreateOrderModalComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<NewOrderPayload>();

  customerOptions: CustomerOption[] = [];
  customersLoading = signal(false);
  customersError = signal<string | null>(null);

  itemOptions: ItemOption[] = ITEM_OPTIONS;

  // Order Date is read-only/display-only, so it isn't a form control.
  todayIso = todayIsoDate();
  todayDisplay = formatOrderDate(this.todayIso);

  headerForm: FormGroup;
  itemForm: FormGroup;

  lineItems = signal<OrderLineItem[]>([]);
  itemFormSubmitted = signal(false); // gates item-row validation messages until first Add Item attempt
  headerSubmitted = signal(false); // gates header validation + "add at least one item" message until Save attempt

  saving = signal(false); // true while the create-order API call is in flight (and the brief success pause after)
  saveError = signal<string | null>(null); // set when the API call fails
  saveSuccessMessage = signal<string | null>(null); // plain-text response body shown after a successful save

  totalAmount = computed(() =>
    this.lineItems().reduce((sum, item) => sum + item.lineTotal, 0)
  );

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private customerService: CustomerService
  ) {
    this.headerForm = this.fb.group({
      customerId: ['', Validators.required]
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
        this.customerOptions = customers;
        this.customersLoading.set(false);
      },
      error: () => {
        this.customersError.set('Failed to load customers. Please try again.');
        this.customersLoading.set(false);
      }
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
    const items = this.lineItems();

    this.saveError.set(null);
    this.saveSuccessMessage.set(null);
    this.saving.set(true);

    this.orderService
      .createOrder({
        customerId,
        orderItems: items.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      })
      .subscribe({
        next: (response) => {
          this.saveSuccessMessage.set(response); // show the API's plain-text response before closing

          setTimeout(() => {
            this.saving.set(false);
            this.saved.emit({
              orderDate: this.todayIso,
              customerId,
              customerName: this.customerName(customerId),
              totalAmount: this.totalAmount(),
              items
            });
          }, 900);
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

  // createOrder() uses responseType: 'text', so err.error holds the API's raw
  // response body (its actual error text) on failure - fall back to err.message
  // only for network-level failures (e.g. CORS, connection refused) that never
  // reached the server and so have no response body.
  private extractErrorMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string' && err.error.trim().length > 0) {
      return err.error;
    }
    return err.message || 'Failed to save order. Please try again.';
  }
}

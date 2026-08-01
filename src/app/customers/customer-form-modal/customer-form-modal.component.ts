import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { CustomerOption } from '../../manageorders/create-order.model';
import { DraggableModalDirective } from '../../shared/draggable-modal.directive';
import { CustomerService } from '../../services/customer.service';

/**
 * Combined "Create New Customer" / "Edit Customer" modal - Create mode when
 * `customer` is null, Edit mode when it's set. Save calls POST/PUT /api/Customer
 * itself and shows a success message while staying open (same pattern as
 * EditOrderModalComponent) - the parent only refreshes the grid once the modal
 * actually closes.
 */
@Component({
  selector: 'app-customer-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DraggableModalDirective],
  templateUrl: './customer-form-modal.component.html',
  styleUrls: ['./customer-form-modal.component.css']
})
export class CustomerFormModalComponent implements OnInit {
  @Input() customer: CustomerOption | null = null;

  @Output() closed = new EventEmitter<void>();

  form: FormGroup;
  submitted = signal(false);
  saving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccessMessage = signal<string | null>(null);

  constructor(private fb: FormBuilder, private customerService: CustomerService) {
    this.form = this.fb.group({
      customerName: ['', [Validators.required, Validators.maxLength(200)]]
    });
  }

  get isEdit(): boolean {
    return this.customer !== null;
  }

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    if (this.customer) {
      this.form.setValue({ customerName: this.customer.customerName });
    }
  }

  onSave(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const customerName = (this.form.value.customerName as string).trim();

    this.saveError.set(null);
    this.saveSuccessMessage.set(null);
    this.saving.set(true);

    const request = this.customer
      ? this.customerService.updateCustomer(this.customer.customerId, {
          id: this.customer.customerId,
          customerName
        })
      : this.customerService.createCustomer({ customerName });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccessMessage.set(this.isEdit ? 'Customer updated successfully.' : 'Customer created successfully.');
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

  // createCustomer()/updateCustomer() use responseType: 'text', so err.error holds the API's raw
  // response body as a string - which for validation failures is itself a JSON object
  // (e.g. {"status":400,"message":"..."}), so pull out just its "message" field rather than
  // showing the whole blob. Falls back to the raw string, then err.message, for shapes that
  // aren't that JSON envelope (e.g. network-level failures that never reached the server).
  private extractErrorMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string' && err.error.trim().length > 0) {
      try {
        const parsed = JSON.parse(err.error);
        if (parsed && typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
          return parsed.message;
        }
      } catch {
        // not JSON - fall through and show the raw string
      }
      return err.error;
    }
    return err.message || 'Failed to save customer. Please try again.';
  }
}

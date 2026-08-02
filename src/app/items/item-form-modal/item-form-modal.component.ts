import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { ItemOption } from '../../manageorders/create-order.model';
import { DraggableModalDirective } from '../../shared/draggable-modal.directive';
import { BackdropCloseDirective } from '../../shared/backdrop-close.directive';
import { ItemService } from '../../services/item.service';

/**
 * Combined "Create New Item" / "Edit Item" modal - Create mode when
 * `item` is null, Edit mode when it's set. Save calls POST/PUT /api/Item
 * itself and shows a success message while staying open (same pattern as
 * CustomerFormModalComponent) - the parent only refreshes the grid once the
 * modal actually closes.
 */
@Component({
  selector: 'app-item-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DraggableModalDirective, BackdropCloseDirective],
  templateUrl: './item-form-modal.component.html',
  styleUrls: ['./item-form-modal.component.css']
})
export class ItemFormModalComponent implements OnInit {
  @Input() item: ItemOption | null = null;

  @Output() closed = new EventEmitter<void>();

  form: FormGroup;
  submitted = signal(false);
  saving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccessMessage = signal<string | null>(null);

  constructor(private fb: FormBuilder, private itemService: ItemService) {
    this.form = this.fb.group({
      itemName: ['', [Validators.required, Validators.maxLength(100)]]
    });
  }

  get isEdit(): boolean {
    return this.item !== null;
  }

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    if (this.item) {
      this.form.setValue({ itemName: this.item.itemName });
    }
  }

  onSave(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const itemName = (this.form.value.itemName as string).trim();

    this.saveError.set(null);
    this.saveSuccessMessage.set(null);
    this.saving.set(true);

    const request = this.item
      ? this.itemService.updateItem(this.item.itemId, {
          id: this.item.itemId,
          itemName
        })
      : this.itemService.createItem({ itemName });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccessMessage.set(this.isEdit ? 'Item updated successfully.' : 'Item created successfully.');
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

  // createItem()/updateItem() use responseType: 'text', so err.error holds the API's raw
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
    return err.message || 'Failed to save item. Please try again.';
  }
}

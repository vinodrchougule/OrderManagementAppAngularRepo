import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { RoleOption, RoleService } from '../../services/role.service';
import { DraggableModalDirective } from '../../shared/draggable-modal.directive';
import { BackdropCloseDirective } from '../../shared/backdrop-close.directive';

/**
 * Combined "Create New Role" / "Edit Role" modal - Create mode when
 * `role` is null, Edit mode when it's set. Save calls POST/PUT /api/Role
 * itself and shows a success message while staying open (same pattern as
 * ItemFormModalComponent) - the parent only refreshes the grid once the
 * modal actually closes.
 */
@Component({
  selector: 'app-role-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DraggableModalDirective, BackdropCloseDirective],
  templateUrl: './role-form-modal.component.html',
  styleUrls: ['./role-form-modal.component.css']
})
export class RoleFormModalComponent implements OnInit {
  @Input() role: RoleOption | null = null;

  @Output() closed = new EventEmitter<void>();

  form: FormGroup;
  submitted = signal(false);
  saving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccessMessage = signal<string | null>(null);

  constructor(private fb: FormBuilder, private roleService: RoleService) {
    this.form = this.fb.group({
      roleName: ['', [Validators.required, Validators.maxLength(100)]]
    });
  }

  get isEdit(): boolean {
    return this.role !== null;
  }

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    if (this.role) {
      this.form.setValue({ roleName: this.role.roleName });
    }
  }

  onSave(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const roleName = (this.form.value.roleName as string).trim();

    this.saveError.set(null);
    this.saveSuccessMessage.set(null);
    this.saving.set(true);

    const request = this.role
      ? this.roleService.updateRole(this.role.roleId, {
          id: this.role.roleId,
          roleName
        })
      : this.roleService.createRole({ roleName });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccessMessage.set(this.isEdit ? 'Role updated successfully.' : 'Role created successfully.');
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

  // createRole()/updateRole() use responseType: 'text', so err.error holds the API's raw
  // response body as a string - which for validation failures is itself a JSON object
  // (e.g. {"status":400,"message":"..."}), so pull out just its "message" field rather than
  // showing the whole blob. Falls back to the raw string, then err.message, for shapes that
  // aren't that JSON envelope (e.g. network-level failures that never reached the server).
  private extractErrorMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string' && err.error.trim().length > 0) {
      try {
        const parsed = JSON.parse(err.error);
        // ModelState validation failures carry the real per-field messages in "errors"
        // (e.g. [{"Key":"RoleName","Value":["Role Name is required."]}]) - "message" on
        // its own is just the generic "Validation failed" wrapper text.
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
    return err.message || 'Failed to save role. Please try again.';
  }
}

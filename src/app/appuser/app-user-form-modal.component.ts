import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { AppUser, AppUserService } from '../services/appuser.service';
import { RoleOption, RoleService } from '../services/role.service';
import { DraggableModalDirective } from '../shared/draggable-modal.directive';
import { BackdropCloseDirective } from '../shared/backdrop-close.directive';

/**
 * "Edit App User" modal - calls PUT /api/AppUser/{id} itself and shows a
 * success message while staying open (same pattern as RoleFormModalComponent) -
 * the parent only refreshes the grid once the modal actually closes.
 */
@Component({
  selector: 'app-app-user-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DraggableModalDirective, BackdropCloseDirective],
  templateUrl: './app-user-form-modal.component.html',
  styleUrls: ['./app-user-form-modal.component.css']
})
export class AppUserFormModalComponent implements OnInit {
  @Input({ required: true }) user!: AppUser;

  @Output() closed = new EventEmitter<void>();

  form: FormGroup;
  submitted = signal(false);
  saving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccessMessage = signal<string | null>(null);
  roleOptions = signal<RoleOption[]>([]);

  constructor(private fb: FormBuilder, private appUserService: AppUserService, private roleService: RoleService) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required]
    });
  }

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    this.form.setValue({
      username: this.user.username,
      email: this.user.email,
      role: this.user.role
    });

    this.roleService.getRoles().subscribe({
      next: (roles) => {
        // The <select> only shows a selection when its value exactly matches one of its
        // rendered <option> values. Match case-insensitively against the fetched roles list,
        // and if the user's current role still isn't in it (e.g. renamed/removed since this
        // user was assigned it), add it as a synthetic option so it stays visible instead of
        // silently falling back to the blank "Select role" placeholder.
        const matchedRole = roles.find(
          (r) => r.roleName.toLowerCase() === this.user.role.toLowerCase()
        );
        this.roleOptions.set(
          matchedRole || !this.user.role
            ? roles
            : [...roles, { roleId: -1, roleName: this.user.role }]
        );
        if (matchedRole && matchedRole.roleName !== this.user.role) {
          this.form.patchValue({ role: matchedRole.roleName });
        }
      }
    });
  }

  onSave(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const username = (this.form.value.username as string).trim();
    const email = (this.form.value.email as string).trim();
    const role = this.form.value.role as string;

    this.saveError.set(null);
    this.saveSuccessMessage.set(null);
    this.saving.set(true);

    this.appUserService.updateAppUser(this.user.id, { id: this.user.id, username, email, role }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccessMessage.set('App user updated successfully.');
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

  // updateAppUser() uses responseType: 'text', so err.error holds the API's raw
  // response body on failure - it's usually a JSON string like
  // {"status":400,"message":"..."}, so pull out just the message. Fall back to
  // err.message only for network-level failures (e.g. CORS, connection refused)
  // that never reached the server.
  private extractErrorMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string' && err.error.trim().length > 0) {
      try {
        const parsed = JSON.parse(err.error);
        // ModelState validation failures carry the real per-field messages in "errors"
        // - "message" on its own is just the generic "Validation failed" wrapper text.
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
        // Not JSON - fall through and use the raw string as-is.
      }
      return err.error;
    }
    return err.message || 'Failed to save app user. Please try again.';
  }
}

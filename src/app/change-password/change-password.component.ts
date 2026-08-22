import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';

import { AppHeaderComponent } from '../shared/app-header.component';
import { AuthService, ChangePasswordRequest } from '../services/auth.service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmNewPassword = control.get('confirmNewPassword')?.value;
  return newPassword === confirmNewPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, AppHeaderComponent],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent {
  submitted = false;
  submitting = signal(false);
  serverError = signal('');
  successMessage = signal<string | null>(null); // set on success; shown for 900ms before navigating to Login

  changePasswordForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.changePasswordForm = this.fb.group(
      {
        username: [this.authService.currentUser()?.username ?? ''],
        currentPassword: ['', [Validators.required, Validators.minLength(8)]],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmNewPassword: ['', [Validators.required, Validators.minLength(8)]]
      },
      { validators: passwordsMatchValidator }
    );
  }

  get f() {
    return this.changePasswordForm.controls;
  }

  onSave(): void {
    this.submitted = true;
    this.serverError.set('');

    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const formValue = this.changePasswordForm.value;
    const payload: ChangePasswordRequest = {
      userName: formValue.username,
      currentPassword: formValue.currentPassword,
      newPassword: formValue.newPassword
    };

    this.submitting.set(true);

    this.authService.changePassword(payload).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.successMessage.set(response?.trim() || 'Password changed successfully.');

        // Stay on the page for 900ms showing the success message (same pattern as
        // Delete Order in Manage Orders), then force re-authentication with the new password.
        setTimeout(() => {
          this.successMessage.set(null);
          this.authService.clearSession();
          this.router.navigate(['/login']);
        }, 900);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.serverError.set(this.extractErrorMessage(err));
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/home']);
  }

  // changePassword() uses responseType: 'text', so err.error holds the API's raw
  // response body on failure - it's usually a JSON string like
  // {"status":400,"message":"..."}, so pull out just the message. Fall back to
  // err.message only for network-level failures (e.g. CORS, connection refused)
  // that never reached the server.
  private extractErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Unable to reach the server. Please check your connection and try again.';
    }

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
        // Not JSON - fall through and use the raw string as-is.
      }
      return err.error;
    }

    return err.message || 'Failed to change password. Please try again.';
  }
}

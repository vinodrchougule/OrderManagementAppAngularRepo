import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { AuthService, ForgotPasswordRequest } from '../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  submitting = signal(false);
  submitted = signal(false);
  serverError = signal('');
  successMessage = signal('');

  forgotPasswordForm: FormGroup;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get f() {
    return this.forgotPasswordForm.controls;
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.serverError.set('');
    this.successMessage.set('');

    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const payload: ForgotPasswordRequest = { email: this.forgotPasswordForm.value.email };

    this.authService.forgotPassword(payload).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.successMessage.set(
          response?.trim() || 'If an account with that email exists, a password reset link has been sent.'
        );
        this.forgotPasswordForm.reset();
        this.submitted.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.serverError.set(this.extractErrorMessage(err));
      }
    });
  }

  // Same JSON-error-body shape as ChangePasswordComponent - see its extractErrorMessage for details.
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

    return err.message || 'Failed to send reset link. Please try again.';
  }
}

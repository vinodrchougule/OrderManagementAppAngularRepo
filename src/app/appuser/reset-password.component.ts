import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';

import { AuthService, ResetPasswordRequest } from '../services/auth.service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmNewPassword = control.get('confirmNewPassword')?.value;
  return newPassword === confirmNewPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  submitted = false;
  submitting = signal(false);
  serverError = signal('');
  successMessage = signal<string | null>(null);
  tokenMissing = signal(false);

  private token = '';

  resetPasswordForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetPasswordForm = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmNewPassword: ['', [Validators.required, Validators.minLength(8)]]
      },
      { validators: passwordsMatchValidator }
    );
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.tokenMissing.set(!this.token);
  }

  get f() {
    return this.resetPasswordForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.serverError.set('');

    if (this.tokenMissing() || this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const payload: ResetPasswordRequest = {
      token: this.token,
      newPassword: this.resetPasswordForm.value.newPassword
    };

    this.submitting.set(true);

    this.authService.resetPassword(payload).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.successMessage.set(response?.trim() || 'Password has been reset successfully.');

        // Briefly show the success message before sending the user to Login, same pattern as ChangePassword.
        setTimeout(() => this.router.navigate(['/login']), 1500);
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

    return err.message || 'Failed to reset password. Please try again.';
  }
}

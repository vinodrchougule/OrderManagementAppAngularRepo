import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';

import { AuthService, RegisterRequest } from '../services/auth.service';
import { RoleOption, RoleService } from '../services/role.service';
import { DraggableModalDirective } from '../shared/draggable-modal.directive';
import { BackdropCloseDirective } from '../shared/backdrop-close.directive';

/**
 * "Register New App User" modal - shown as an overlay (from the Login page and from the
 * App Users page) instead of navigating to the standalone /register page. Calls
 * AuthService.register() itself and shows a success message while staying open (same
 * pattern as AppUserFormModalComponent) - the caller only refreshes/redirects once the
 * modal actually closes.
 */
@Component({
  selector: 'app-register-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DraggableModalDirective, BackdropCloseDirective],
  templateUrl: './register-modal.component.html',
  styleUrls: ['./register-modal.component.css']
})
export class RegisterModalComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();

  roleOptions = signal<RoleOption[]>([]);

  submitting = signal(false);
  submitted = signal(false);
  serverError = signal('');
  successMessage = signal('');

  registerForm: FormGroup;

  constructor(private fb: FormBuilder, private authService: AuthService, private roleService: RoleService) {
    this.registerForm = this.fb.group({
      username: [
        '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(20)]
      ],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          RegisterModalComponent.passwordStrengthValidator
        ]
      ],
      role: ['', Validators.required]
    });
  }

  // Custom validator: requires at least one letter and one number
  static passwordStrengthValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const value: string = control.value || '';
    const hasLetter = /[A-Za-z]/.test(value);
    const hasNumber = /\d/.test(value);
    return hasLetter && hasNumber ? null : { weakPassword: true };
  }

  get f() {
    return this.registerForm.controls;
  }

  ngOnInit(): void {
    this.roleService.getRoles().subscribe({
      next: (roles) => this.roleOptions.set(roles)
    });
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.serverError.set('');
    this.successMessage.set('');

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const payload: RegisterRequest = this.registerForm.value as RegisterRequest;

    this.authService.register(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set('Registration successful!');
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.serverError.set(this.extractErrorMessage(err));
        console.error('Registration request failed:', err);
      }
    });
  }

  onCancel(): void {
    this.closed.emit();
  }

  private extractErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Unable to reach the server. Please check your connection and try again.';
    }
    const apiError = err.error;
    if (apiError) {
      if (typeof apiError === 'string') {
        return apiError;
      }
      if (apiError.message) {
        return apiError.message;
      }
      if (apiError.title) {
        // ASP.NET Core ProblemDetails / ModelState error shape
        return apiError.title;
      }
      if (apiError.errors) {
        const firstKey = Object.keys(apiError.errors)[0];
        const firstError = apiError.errors[firstKey];
        if (Array.isArray(firstError) && firstError.length) {
          return firstError[0];
        }
      }
    }
    return 'Registration failed. Please try again.';
  }
}

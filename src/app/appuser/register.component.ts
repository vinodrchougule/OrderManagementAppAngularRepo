import { Component } from '@angular/core';
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

export interface UserRegistration {
  username: string;
  email: string;
  password: string;
  role: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  roles: string[] = ['Admin', 'Manager', 'Employee', 'Customer'];

  submitting = false;
  submitted = false;
  serverError = '';
  successMessage = '';

  registerForm!: FormGroup;

  constructor(private fb: FormBuilder, private authService: AuthService) {
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
          RegisterComponent.passwordStrengthValidator
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

  onSubmit(): void {
    this.submitted = true;
    this.serverError = '';
    this.successMessage = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload: RegisterRequest = this.registerForm.value as UserRegistration;

    this.authService.register(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.successMessage = 'Registration successful! You can now log in.';
        this.registerForm.reset();
        this.submitted = false;
      },
      error: (err: HttpErrorResponse) => {
        this.submitting = false;
        this.serverError = this.extractErrorMessage(err);
      }
    });
  }

  onCancel(): void {
    this.registerForm.reset();
    this.submitted = false;
    this.serverError = '';
    this.successMessage = '';
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

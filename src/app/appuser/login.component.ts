import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import { AuthService, LoginRequest, LoginResponse } from '../services/auth.service';

export interface UserLogin {
  username: string;
  password: string;
  rememberMe: boolean;
}

//Test change
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  submitting = signal(false);
  submitted = signal(false);
  serverError = signal('');
  successMessage = signal('');

  loginForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: [
        '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(20)]
      ],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.serverError.set('');
    this.successMessage.set('');

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const formValue: UserLogin = this.loginForm.value as UserLogin;
    const payload: LoginRequest = {
      userName: formValue.username,
      password: formValue.password
    };

    this.authService.login(payload).subscribe({
      next: (res: LoginResponse) => {
        this.submitting.set(false);
        this.successMessage.set((res && res['message']) || 'Login successful!');
        this.authService.setSession(res);

        // Briefly show the success message before redirecting to Home.
        setTimeout(() => this.router.navigate(['/home']), 900);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.serverError.set(this.extractErrorMessage(err));
        console.error('Login request failed:', err);
      }
    });
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
    if (err.status === 401 || err.status === 400) {
      return 'Invalid username or password.';
    }
    return 'Login failed. Please try again.';
  }
}

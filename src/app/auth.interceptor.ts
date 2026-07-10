import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from './services/auth.service';

/**
 * Attaches the logged-in user's access token (if any) as a Bearer
 * Authorization header on every outgoing request, so [Authorize]-protected
 * endpoints (e.g. /api/Auth/logout) receive valid credentials.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.currentUser()?.accessToken;

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};

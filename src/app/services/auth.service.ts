import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role: string;
}


export interface RegisterResponse {
  [key: string]: any;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface ChangePasswordRequest {
  userName: string;
  currentPassword: string;
  newPassword: string;
}

export interface LoginResponse {
  id?: number;
  username?: string;
  email?: string;
  role?: string;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiry?: string;
  [key: string]: any;
}

const SESSION_STORAGE_KEY = 'oma_session';
const REMEMBER_ME_STORAGE_KEY = 'oma_remember_me';

export interface RememberedCredentials {
  userName: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = 'https://localhost:7217/api/Auth';

  private readonly _currentUser = signal<LoginResponse | null>(this.readStoredSession());
  readonly currentUser = this._currentUser.asReadonly();

  constructor(private http: HttpClient) {}

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, payload);
  }

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, payload);
  }

  // POST /api/Auth/change-password - API responds with a plain-text body, not JSON
  // (same as RoleService/ItemService create/update calls), so responseType must be 'text'.
  changePassword(payload: ChangePasswordRequest): Observable<string> {
    return this.http.post(`${this.baseUrl}/change-password`, payload, { responseType: 'text' });
  }

  /** Persist the logged-in user's session (called after a successful login). */
  setSession(session: LoginResponse): void {
    this._currentUser.set(session);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // localStorage unavailable (e.g. private browsing) - session stays in-memory only.
    }
  }

  /** Calls the logout API. Caller should subscribe and clear the session on completion. */
  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/logout`, {});
  }

  /** Clears the locally stored session (localStorage + in-memory signal). */
  clearSession(): void {
    this._currentUser.set(null);
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  isLoggedIn(): boolean {
    return !!this._currentUser();
  }

  /** Persists the given credentials so the login form can be pre-filled next time. */
  rememberCredentials(credentials: RememberedCredentials): void {
    try {
      localStorage.setItem(REMEMBER_ME_STORAGE_KEY, JSON.stringify(credentials));
    } catch {
      // localStorage unavailable (e.g. private browsing) - ignore.
    }
  }

  /** Removes any previously remembered credentials. */
  forgetCredentials(): void {
    try {
      localStorage.removeItem(REMEMBER_ME_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  getRememberedCredentials(): RememberedCredentials | null {
    try {
      const raw = localStorage.getItem(REMEMBER_ME_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as RememberedCredentials) : null;
    } catch {
      return null;
    }
  }

  private readStoredSession(): LoginResponse | null {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as LoginResponse) : null;
    } catch {
      return null;
    }
  }
}

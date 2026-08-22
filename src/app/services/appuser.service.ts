import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AppUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface UpdateAppUserRequest {
  id: number; // must match the {id} route segment
  username: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppUserService {
  // Backend controller is AppUserController ([Route("api/[controller]")]), so the route is
  // "api/AppUser"
  private readonly baseUrl = 'https://localhost:7217/api/AppUser';

  constructor(private http: HttpClient) {}

  // GET /api/AppUser - full app user list, used to populate the App Users grid.
  getAppUsers(): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(this.baseUrl);
  }

  // PUT /api/AppUser/{id} - API responds with a plain-text body, not JSON (same as RoleService),
  // so responseType must be 'text'.
  updateAppUser(id: number, payload: UpdateAppUserRequest): Observable<string> {
    return this.http.put(`${this.baseUrl}/${id}`, payload, { responseType: 'text' });
  }

  // DELETE /api/AppUser/{id}
  deleteAppUser(id: number): Observable<string> {
    return this.http.delete(`${this.baseUrl}/${id}`, { responseType: 'text' });
  }
}

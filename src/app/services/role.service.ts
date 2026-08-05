import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Shape of each entry in GET /api/AppRole's response body (AppRoleResponse on the API side).
interface RoleApiRole {
  id: number;
  roleName: string;
}

export interface RoleOption {
  roleId: number;
  roleName: string;
}

export interface CreateRoleRequest {
  roleName: string;
}

export interface UpdateRoleRequest {
  id: number; // must match the {roleId} route segment - API's AppRoleResponse DTO uses "id", not "roleId" (see RoleApiRole)
  roleName: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  // Backend controller is AppRoleController ([Route("api/[controller]")]), so the route is
  // "api/AppRole"
  private readonly baseUrl = 'https://localhost:7217/api/AppRole';

  constructor(private http: HttpClient) {}

  // POST /api/AppRole - API responds with a plain-text body, not JSON (same as ItemService.createItem),
  // so responseType must be 'text'.
  createRole(payload: CreateRoleRequest): Observable<string> {
    return this.http.post(this.baseUrl, payload, { responseType: 'text' });
  }

  // GET /api/AppRole - full role list, used to populate the Roles grid.
  getRoles(): Observable<RoleOption[]> {
    return this.http.get<RoleApiRole[]>(this.baseUrl).pipe(
      map((roles) => roles.map((role) => ({ roleId: role.id, roleName: role.roleName })))
    );
  }

  // PUT /api/AppRole/{roleId} - persists the Edit Role modal's changes.
  updateRole(roleId: number, payload: UpdateRoleRequest): Observable<string> {
    return this.http.put(`${this.baseUrl}/${roleId}`, payload, { responseType: 'text' });
  }

  // DELETE /api/AppRole/{roleId}
  deleteRole(roleId: number): Observable<string> {
    return this.http.delete(`${this.baseUrl}/${roleId}`, { responseType: 'text' });
  }
}

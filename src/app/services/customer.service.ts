import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CustomerOption } from '../manageorders/create-order.model';

// Shape of each entry in GET /api/Customer's response body (CustomerResponse on the API side).
interface CustomerApiItem {
  id: number;
  customerName: string;
}

export interface CreateCustomerRequest {
  customerName: string;
}

export interface UpdateCustomerRequest {
  id: number; // must match the {customerId} route segment - API's Customer model uses "id", not "customerId" (see CustomerApiItem)
  customerName: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private readonly baseUrl = 'https://localhost:7217/api/Customer';

  constructor(private http: HttpClient) {}

  // GET /api/Customer - full customer list, used to populate the Create New Order modal's dropdown
  // and the Customers grid.
  getCustomers(): Observable<CustomerOption[]> {
    return this.http.get<CustomerApiItem[]>(this.baseUrl).pipe(
      map((items) => items.map((item) => ({ customerId: item.id, customerName: item.customerName })))
    );
  }

  // POST /api/Customer - API responds with a plain-text body, not JSON (same as OrderService.createOrder),
  // so responseType must be 'text'.
  createCustomer(payload: CreateCustomerRequest): Observable<string> {
    return this.http.post(this.baseUrl, payload, { responseType: 'text' });
  }

  // PUT /api/Customer/{customerId} - persists the Edit Customer modal's changes.
  updateCustomer(customerId: number, payload: UpdateCustomerRequest): Observable<string> {
    return this.http.put(`${this.baseUrl}/${customerId}`, payload, { responseType: 'text' });
  }

  // DELETE /api/Customer/{customerId}
  deleteCustomer(customerId: number): Observable<string> {
    return this.http.delete(`${this.baseUrl}/${customerId}`, { responseType: 'text' });
  }
}

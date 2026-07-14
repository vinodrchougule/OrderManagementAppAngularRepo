import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateOrderItemRequest {
  itemId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderRequest {
  customerId: number;
  orderItems: CreateOrderItemRequest[];
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly baseUrl = 'https://localhost:7217/api/Order';

  constructor(private http: HttpClient) {}

  // API responds with a plain-text body (e.g. "Created. Order Id:23"), not JSON,
  // so responseType must be 'text' - otherwise HttpClient's default JSON parsing
  // throws on the non-JSON body and the call surfaces as an error despite a 200/201.
  createOrder(payload: CreateOrderRequest): Observable<string> {
    return this.http.post(this.baseUrl, payload, { responseType: 'text' });
  }
}

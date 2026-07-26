import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Order, OrderLineItem, OrderStatus } from '../manageorders/order.model';

export interface CreateOrderItemRequest {
  itemId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderRequest {
  customerId: number;
  orderItems: CreateOrderItemRequest[];
}

export interface UpdateOrderItemRequest {
  orderItemId?: number; // omitted for a line item added during this edit (not yet persisted)
  itemId: number;
  quantity: number;
  unitPrice: number;
}

export interface UpdateOrderRequest {
  orderId: number; // must match the {orderId} route segment - the API rejects a mismatch
  orderDate: string;
  customerId: number;
  status: number; // backend OrderStatus enum's numeric value - it rejects the string name (see STATUS_COLORS' key order)
  rowVersion: string; // concurrency token from the order last fetched, echoed back so the API can detect conflicting edits
  orderItems: UpdateOrderItemRequest[];
}

// Shape of each entry in GET /api/Order's "items" array (OrderResponse on the API side).
interface OrderApiItem {
  orderId: number;
  orderDate: string; // ISO date-time string, e.g. "2026-07-14T00:00:00"
  customerId: number;
  customerName: string;
  totalAmount: number;
  status: OrderStatus;
  rowVersion: string; // concurrency token, echoed back on updates
  orderItems: {
    orderItemId: number;
    itemId: number;
    itemName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
}

// Shape of GET /api/Order's response body (PagedResult<OrderResponse> on the API side).
interface OrderApiPage {
  items: OrderApiItem[];
  pageNo: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface OrdersPage {
  items: Order[];
  pageNo: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
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

  // GET /api/Order/{orderId} - single order's full detail (incl. line items) for the View Order modal.
  getOrderById(orderId: number): Observable<Order> {
    return this.http.get<OrderApiItem>(`${this.baseUrl}/${orderId}`).pipe(map((item) => this.toOrder(item)));
  }

  // PUT /api/Order/{orderId} - persists the Edit Order modal's changes. Same
  // responseType rationale as createOrder: the API's response body is plain text.
  updateOrder(orderId: number, payload: UpdateOrderRequest): Observable<string> {
    return this.http.put(`${this.baseUrl}/${orderId}`, payload, { responseType: 'text' });
  }

  // DELETE /api/Order/{orderId} - responseType 'text' for the same reason as createOrder:
  // the API's response body isn't guaranteed to be JSON (may also be empty on 204).
  deleteOrder(orderId: number): Observable<string> {
    return this.http.delete(`${this.baseUrl}/${orderId}`, { responseType: 'text' });
  }

  // GET /api/Order?PageNo=..&PageSize=.. - one page of orders plus paging metadata.
  getOrders(pageNo: number, pageSize: number): Observable<OrdersPage> {
    const params = new HttpParams().set('PageNo', pageNo).set('PageSize', pageSize);
    return this.http.get<OrderApiPage>(this.baseUrl, { params }).pipe(
      map((page) => ({
        items: page.items.map((item) => this.toOrder(item)),
        pageNo: page.pageNo,
        pageSize: page.pageSize,
        totalCount: page.totalCount,
        totalPages: page.totalPages
      }))
    );
  }

  // GET /api/Order/search?searchText=..&PageNo=..&PageSize=.. - one page of orders
  // matching searchText (e.g. customer name), plus paging metadata.
  searchOrders(searchText: string, pageNo: number, pageSize: number): Observable<OrdersPage> {
    const params = new HttpParams()
      .set('searchText', searchText)
      .set('PageNo', pageNo)
      .set('PageSize', pageSize);
    return this.http.get<OrderApiPage>(`${this.baseUrl}/search`, { params }).pipe(
      map((page) => ({
        items: page.items.map((item) => this.toOrder(item)),
        pageNo: page.pageNo,
        pageSize: page.pageSize,
        totalCount: page.totalCount,
        totalPages: page.totalPages
      }))
    );
  }

  // orderDate comes back as a full ISO date-time ("2026-07-14T00:00:00") - trim to
  // the "yyyy-MM-dd" date-only form the rest of the app (formatOrderDate, edit/create
  // modals) expects.
  private toOrder(item: OrderApiItem): Order {
    return {
      orderId: item.orderId,
      orderDate: item.orderDate.slice(0, 10),
      customerId: item.customerId,
      customerName: item.customerName,
      totalAmount: item.totalAmount,
      status: item.status,
      rowVersion: item.rowVersion,
      items: item.orderItems.map(
        (oi): OrderLineItem => ({
          orderItemId: oi.orderItemId,
          itemId: oi.itemId,
          itemName: oi.itemName,
          quantity: oi.quantity,
          unitPrice: oi.unitPrice,
          lineTotal: oi.lineTotal
        })
      )
    };
  }
}

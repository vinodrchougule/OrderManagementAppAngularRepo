import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ItemOption } from '../manageorders/create-order.model';

// Shape of each entry in GET /api/Item's response body (ItemResponse on the API side).
interface ItemApiItem {
  id: number;
  itemName: string;
}

export interface CreateItemRequest {
  itemName: string;
}

export interface UpdateItemRequest {
  id: number; // must match the {itemId} route segment - API's Item model uses "id", not "itemId" (see ItemApiItem)
  itemName: string;
}

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private readonly baseUrl = 'https://localhost:7217/api/Item';

  constructor(private http: HttpClient) {}

  // POST /api/Item - API responds with a plain-text body, not JSON (same as CustomerService.createCustomer),
  // so responseType must be 'text'.
  createItem(payload: CreateItemRequest): Observable<string> {
    return this.http.post(this.baseUrl, payload, { responseType: 'text' });
  }

  // GET /api/Item - full item list, used to populate the Items grid.
  getItems(): Observable<ItemOption[]> {
    return this.http.get<ItemApiItem[]>(this.baseUrl).pipe(
      map((items) => items.map((item) => ({ itemId: item.id, itemName: item.itemName })))
    );
  }

  // PUT /api/Item/{itemId} - persists the Edit Item modal's changes.
  updateItem(itemId: number, payload: UpdateItemRequest): Observable<string> {
    return this.http.put(`${this.baseUrl}/${itemId}`, payload, { responseType: 'text' });
  }

  // DELETE /api/Item/{itemId}
  deleteItem(itemId: number): Observable<string> {
    return this.http.delete(`${this.baseUrl}/${itemId}`, { responseType: 'text' });
  }
}

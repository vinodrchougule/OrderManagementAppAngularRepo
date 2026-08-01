import { OrderLineItem } from './order.model';

/** Customer option shown in the Create New Order modal's dropdown, fetched from GET /api/Customer. */
export interface CustomerOption {
  customerId: number;
  customerName: string;
}

/** Hardcoded item list for the Create New Order modal (no items API yet). */
export interface ItemOption {
  itemId: number;
  itemName: string;
}

export const ITEM_OPTIONS: ItemOption[] = [
  { itemId: 1, itemName: 'Test Item1' },
  { itemId: 2, itemName: 'Test Item2' }
];

/** Payload emitted by the modal's "Save Order" button. */
export interface NewOrderPayload {
  orderDate: string;
  customerId: number;
  customerName: string;
  totalAmount: number;
  items: OrderLineItem[];
}

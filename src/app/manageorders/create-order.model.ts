import { OrderLineItem } from './order.model';

/** Hardcoded customer list for the Create New Order modal (no customers API yet). */
export interface CustomerOption {
  customerId: number;
  customerName: string;
}

export const CUSTOMER_OPTIONS: CustomerOption[] = [
  { customerId: 1, customerName: 'Test Customer1' },
  { customerId: 2, customerName: 'Test Customer2' }
];

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

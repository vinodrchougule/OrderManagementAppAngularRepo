import { OrderLineItem } from './order.model';

/** Customer option shown in the Create New Order modal's dropdown, fetched from GET /api/Customer. */
export interface CustomerOption {
  customerId: number;
  customerName: string;
}

/** Item option shown in the Create/Edit Order modals' dropdown, fetched from GET /api/Item. */
export interface ItemOption {
  itemId: number;
  itemName: string;
}

/** Payload emitted by the modal's "Save Order" button. */
export interface NewOrderPayload {
  orderDate: string;
  customerId: number;
  customerName: string;
  totalAmount: number;
  items: OrderLineItem[];
}

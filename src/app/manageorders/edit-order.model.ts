import { OrderLineItem, OrderStatus } from './order.model';

/** Payload emitted by the Edit Order modal's "Save Changes" button. */
export interface EditOrderPayload {
  orderId: number;
  orderDate: string;
  customerId: number;
  customerName: string;
  totalAmount: number;
  status: OrderStatus;
  items: OrderLineItem[];
}

// Order matters - it mirrors the backend OrderStatus enum's declaration order
// (Pending=0, Confirmed=1, Shipped=2, Delivered=3, Cancelled=4), which the Edit
// Order modal relies on to send the numeric value the update API expects.
export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';

// Moved here (from create-order.model.ts) so both the Create and View order
// modals can share the same line-item shape.
export interface OrderLineItem {
  orderItemId?: number; // persisted row id (Edit Order modal's read-only "OrderItemId" column); absent for not-yet-saved items
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  orderId: number;
  orderDate: string; // ISO date string (yyyy-MM-dd)
  customerId: number;
  customerName: string;
  totalAmount: number;
  status: OrderStatus;
  rowVersion: string; // concurrency token, echoed back on updates
  items?: OrderLineItem[]; // line items shown in the View Order modal's Item Details grid
}

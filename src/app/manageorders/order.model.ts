export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

// Moved here (from create-order.model.ts) so both the Create and View order
// modals can share the same line-item shape.
export interface OrderLineItem {
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
  items?: OrderLineItem[]; // line items shown in the View Order modal's Item Details grid
}

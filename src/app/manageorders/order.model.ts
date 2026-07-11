export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface Order {
  orderId: number;
  orderDate: string; // ISO date string (yyyy-MM-dd)
  customerId: number;
  customerName: string;
  totalAmount: number;
  status: OrderStatus;
}

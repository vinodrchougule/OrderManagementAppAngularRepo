import { OrderStatus } from './order.model';

// Shared between the grid's Status column cell renderer and the View Order
// modal's Status field, so both use the same badge colours.
export const STATUS_COLORS: Record<OrderStatus, string> = {
  Pending: '#b45309',
  Processing: '#1d4ed8',
  Shipped: '#6d28d9',
  Delivered: '#15803d',
  Cancelled: '#b91c1c'
};

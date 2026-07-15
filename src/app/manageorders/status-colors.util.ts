import { OrderStatus } from './order.model';

// Shared between the grid's Status column cell renderer and the View/Edit Order
// modals' Status field, so both use the same badge colours. Key order matches
// the backend OrderStatus enum's declaration order - the Edit Order modal's
// dropdown (built from these keys) relies on that order to derive the enum's
// numeric value for the update API.
export const STATUS_COLORS: Record<OrderStatus, string> = {
  Pending: '#b45309',
  Confirmed: '#1d4ed8',
  Shipped: '#6d28d9',
  Delivered: '#15803d',
  Cancelled: '#b91c1c'
};

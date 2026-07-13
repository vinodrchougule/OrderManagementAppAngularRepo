import { Order } from './order.model';

// TODO: Replace with data from the Orders API once the backend endpoint is available.
// `items` is illustrative mock line-item data (View/Edit Order modals' item grids);
// orderItemId values are just sequential mock row ids and don't need to sum to totalAmount.
export const MOCK_ORDERS: Order[] = [
  { orderId: 1001, orderDate: '2026-07-01', customerId: 501, customerName: 'Vibha Chougule', totalAmount: 2499.0, status: 'Delivered', items: [
    { orderItemId: 1, itemId: 1, itemName: 'Test Item1', quantity: 2, unitPrice: 999.5, lineTotal: 1999.0 },
    { orderItemId: 2, itemId: 2, itemName: 'Test Item2', quantity: 1, unitPrice: 500.0, lineTotal: 500.0 }
  ] },
  { orderId: 1002, orderDate: '2026-07-02', customerId: 502, customerName: 'Rohan Kulkarni', totalAmount: 899.5, status: 'Shipped', items: [
    { orderItemId: 3, itemId: 2, itemName: 'Test Item2', quantity: 1, unitPrice: 899.5, lineTotal: 899.5 }
  ] },
  { orderId: 1003, orderDate: '2026-07-03', customerId: 503, customerName: 'Ananya Deshpande', totalAmount: 15499.0, status: 'Processing', items: [
    { orderItemId: 4, itemId: 1, itemName: 'Test Item1', quantity: 5, unitPrice: 2999.8, lineTotal: 14999.0 },
    { orderItemId: 5, itemId: 2, itemName: 'Test Item2', quantity: 1, unitPrice: 500.0, lineTotal: 500.0 }
  ] },
  { orderId: 1004, orderDate: '2026-07-03', customerId: 504, customerName: 'Sameer Joshi', totalAmount: 349.99, status: 'Pending', items: [
    { orderItemId: 6, itemId: 2, itemName: 'Test Item2', quantity: 1, unitPrice: 349.99, lineTotal: 349.99 }
  ] },
  { orderId: 1005, orderDate: '2026-07-04', customerId: 505, customerName: 'Priya Nair', totalAmount: 5250.0, status: 'Cancelled', items: [
    { orderItemId: 7, itemId: 1, itemName: 'Test Item1', quantity: 3, unitPrice: 1750.0, lineTotal: 5250.0 }
  ] },
  { orderId: 1006, orderDate: '2026-07-05', customerId: 506, customerName: 'Arjun Mehta', totalAmount: 1200.0, status: 'Delivered', items: [
    { orderItemId: 8, itemId: 2, itemName: 'Test Item2', quantity: 2, unitPrice: 600.0, lineTotal: 1200.0 }
  ] },
  { orderId: 1007, orderDate: '2026-07-06', customerId: 501, customerName: 'Vibha Chougule', totalAmount: 799.0, status: 'Shipped', items: [
    { orderItemId: 9, itemId: 1, itemName: 'Test Item1', quantity: 1, unitPrice: 799.0, lineTotal: 799.0 }
  ] },
  { orderId: 1008, orderDate: '2026-07-06', customerId: 507, customerName: 'Neha Kapoor', totalAmount: 3120.75, status: 'Processing', items: [
    { orderItemId: 10, itemId: 1, itemName: 'Test Item1', quantity: 2, unitPrice: 1200.0, lineTotal: 2400.0 },
    { orderItemId: 11, itemId: 2, itemName: 'Test Item2', quantity: 1, unitPrice: 720.75, lineTotal: 720.75 }
  ] },
  { orderId: 1009, orderDate: '2026-07-07', customerId: 508, customerName: 'Karan Malhotra', totalAmount: 45.0, status: 'Delivered', items: [
    { orderItemId: 12, itemId: 2, itemName: 'Test Item2', quantity: 1, unitPrice: 45.0, lineTotal: 45.0 }
  ] },
  { orderId: 1010, orderDate: '2026-07-08', customerId: 509, customerName: 'Isha Reddy', totalAmount: 6789.0, status: 'Pending', items: [
    { orderItemId: 13, itemId: 1, itemName: 'Test Item1', quantity: 3, unitPrice: 2000.0, lineTotal: 6000.0 },
    { orderItemId: 14, itemId: 2, itemName: 'Test Item2', quantity: 1, unitPrice: 789.0, lineTotal: 789.0 }
  ] },
  { orderId: 1011, orderDate: '2026-07-09', customerId: 510, customerName: 'Vikram Singh', totalAmount: 259.49, status: 'Shipped', items: [
    { orderItemId: 15, itemId: 2, itemName: 'Test Item2', quantity: 1, unitPrice: 259.49, lineTotal: 259.49 }
  ] },
  { orderId: 1012, orderDate: '2026-07-10', customerId: 502, customerName: 'Rohan Kulkarni', totalAmount: 999.0, status: 'Cancelled', items: [
    { orderItemId: 16, itemId: 1, itemName: 'Test Item1', quantity: 1, unitPrice: 999.0, lineTotal: 999.0 }
  ] },
  { orderId: 1013, orderDate: '2026-07-10', customerId: 511, customerName: 'Divya Iyer', totalAmount: 12500.0, status: 'Delivered', items: [
    { orderItemId: 17, itemId: 1, itemName: 'Test Item1', quantity: 4, unitPrice: 3125.0, lineTotal: 12500.0 }
  ] },
  { orderId: 1014, orderDate: '2026-07-11', customerId: 512, customerName: 'Aditya Rao', totalAmount: 175.25, status: 'Pending', items: [
    { orderItemId: 18, itemId: 2, itemName: 'Test Item2', quantity: 1, unitPrice: 175.25, lineTotal: 175.25 }
  ] },
  { orderId: 1015, orderDate: '2026-07-11', customerId: 513, customerName: 'Meera Pillai', totalAmount: 3899.0, status: 'Processing', items: [
    { orderItemId: 19, itemId: 1, itemName: 'Test Item1', quantity: 1, unitPrice: 2899.0, lineTotal: 2899.0 },
    { orderItemId: 20, itemId: 2, itemName: 'Test Item2', quantity: 1, unitPrice: 1000.0, lineTotal: 1000.0 }
  ] }
];

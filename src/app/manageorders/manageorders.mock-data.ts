import { Order } from './order.model';

// TODO: Replace with data from the Orders API once the backend endpoint is available.
export const MOCK_ORDERS: Order[] = [
  { orderId: 1001, orderDate: '2026-07-01', customerId: 501, customerName: 'Vibha Chougule', totalAmount: 2499.0, status: 'Delivered' },
  { orderId: 1002, orderDate: '2026-07-02', customerId: 502, customerName: 'Rohan Kulkarni', totalAmount: 899.5, status: 'Shipped' },
  { orderId: 1003, orderDate: '2026-07-03', customerId: 503, customerName: 'Ananya Deshpande', totalAmount: 15499.0, status: 'Processing' },
  { orderId: 1004, orderDate: '2026-07-03', customerId: 504, customerName: 'Sameer Joshi', totalAmount: 349.99, status: 'Pending' },
  { orderId: 1005, orderDate: '2026-07-04', customerId: 505, customerName: 'Priya Nair', totalAmount: 5250.0, status: 'Cancelled' },
  { orderId: 1006, orderDate: '2026-07-05', customerId: 506, customerName: 'Arjun Mehta', totalAmount: 1200.0, status: 'Delivered' },
  { orderId: 1007, orderDate: '2026-07-06', customerId: 501, customerName: 'Vibha Chougule', totalAmount: 799.0, status: 'Shipped' },
  { orderId: 1008, orderDate: '2026-07-06', customerId: 507, customerName: 'Neha Kapoor', totalAmount: 3120.75, status: 'Processing' },
  { orderId: 1009, orderDate: '2026-07-07', customerId: 508, customerName: 'Karan Malhotra', totalAmount: 45.0, status: 'Delivered' },
  { orderId: 1010, orderDate: '2026-07-08', customerId: 509, customerName: 'Isha Reddy', totalAmount: 6789.0, status: 'Pending' },
  { orderId: 1011, orderDate: '2026-07-09', customerId: 510, customerName: 'Vikram Singh', totalAmount: 259.49, status: 'Shipped' },
  { orderId: 1012, orderDate: '2026-07-10', customerId: 502, customerName: 'Rohan Kulkarni', totalAmount: 999.0, status: 'Cancelled' },
  { orderId: 1013, orderDate: '2026-07-10', customerId: 511, customerName: 'Divya Iyer', totalAmount: 12500.0, status: 'Delivered' },
  { orderId: 1014, orderDate: '2026-07-11', customerId: 512, customerName: 'Aditya Rao', totalAmount: 175.25, status: 'Pending' },
  { orderId: 1015, orderDate: '2026-07-11', customerId: 513, customerName: 'Meera Pillai', totalAmount: 3899.0, status: 'Processing' }
];

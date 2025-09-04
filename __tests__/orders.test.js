import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { Hono } from 'hono';
import orderRouter from '../api/routes/orders.js';

describe('Order Service Tests', () => {
  let app;
  let mockEnv;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/orders', orderRouter);

    mockEnv = {
      DB_AVAILABLE: false,
      SQL: null
    };
  });

  describe('GET /api/orders', () => {
    test('should return mock orders when DB not available', async () => {
      const req = new Request('http://localhost/api/orders');
      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.orders).toBeDefined();
      expect(Array.isArray(data.orders)).toBe(true);
      expect(data.orders.length).toBeGreaterThan(0);
    });

    test('should filter orders by user_id', async () => {
      const mockOrders = [
        { id: 1, user_id: 1, total_amount: 100, status: 'pending' },
        { id: 2, user_id: 2, total_amount: 200, status: 'completed' }
      ];

      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockResolvedValue(mockOrders.filter(o => o.user_id === 1));

      const req = new Request('http://localhost/api/orders?user_id=1');
      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.orders).toHaveLength(1);
      expect(data.orders[0].user_id).toBe(1);
    });

    test('should filter orders by status', async () => {
      const mockOrders = [
        { id: 1, status: 'pending' },
        { id: 2, status: 'completed' }
      ];

      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockResolvedValue(mockOrders.filter(o => o.status === 'pending'));

      const req = new Request('http://localhost/api/orders?status=pending');
      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.orders).toHaveLength(1);
      expect(data.orders[0].status).toBe('pending');
    });
  });

  describe('GET /api/orders/:id', () => {
    test('should return order with items', async () => {
      const req = new Request('http://localhost/api/orders/1');
      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.order).toBeDefined();
      expect(data.order.id).toBe(1);
      expect(data.order.items).toBeDefined();
      expect(Array.isArray(data.order.items)).toBe(true);
    });

    test('should return 404 when order not found', async () => {
      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn()
        .mockResolvedValueOnce([]) // For order query
        .mockResolvedValueOnce([]); // For items query

      const req = new Request('http://localhost/api/orders/999');
      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Order not found');
    });
  });

  describe('POST /api/orders', () => {
    test('should create new order successfully', async () => {
      const orderData = {
        user_id: 1,
        items: [
          { product_id: 1, quantity: 2 },
          { product_id: 2, quantity: 1 }
        ],
        shipping_address: '123 Test St'
      };

      const req = new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.order).toBeDefined();
      expect(data.order.user_id).toBe(orderData.user_id);
      expect(data.order.items).toBeDefined();
    });

    test('should return 400 when required fields missing', async () => {
      const orderData = {
        user_id: 1
        // missing items
      };

      const req = new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('User ID and items array are required');
    });

    test('should return 400 when items array is empty', async () => {
      const orderData = {
        user_id: 1,
        items: []
      };

      const req = new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('User ID and items array are required');
    });

    test('should return 400 when item structure is invalid', async () => {
      const orderData = {
        user_id: 1,
        items: [
          { product_id: 1 } // missing quantity
        ]
      };

      const req = new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Each item must have product_id and positive quantity');
    });

    test('should handle database operations when DB available', async () => {
      mockEnv.DB_AVAILABLE = true;

      // Mock user exists
      mockEnv.SQL = jest.fn()
        .mockResolvedValueOnce([{ id: 1 }]) // User query
        .mockResolvedValueOnce([  // Products query
          { id: 1, name: 'Product 1', price: 29.99, stock_quantity: 100, is_active: true },
          { id: 2, name: 'Product 2', price: 19.99, stock_quantity: 50, is_active: true }
        ])
        .mockResolvedValueOnce([{ // Order insert
          id: 1, user_id: 1, total_amount: 79.97, status: 'pending',
          shipping_address: '123 Test St', created_at: new Date()
        }])
        .mockResolvedValue(); // For subsequent operations

      const orderData = {
        user_id: 1,
        items: [
          { product_id: 1, quantity: 2 },
          { product_id: 2, quantity: 1 }
        ],
        shipping_address: '123 Test St'
      };

      const req = new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.order.user_id).toBe(1);
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    test('should update order status successfully', async () => {
      const statusData = { status: 'processing' };

      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockResolvedValue([
        { id: 1, status: 'processing', updated_at: new Date() }
      ]);

      const req = new Request('http://localhost/api/orders/1/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusData)
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.order.status).toBe('processing');
    });

    test('should return 400 when status is invalid', async () => {
      const statusData = { status: 'invalid_status' };

      const req = new Request('http://localhost/api/orders/1/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusData)
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Valid status is required');
    });
  });

  describe('DELETE /api/orders/:id', () => {
    test('should cancel order successfully when status is pending', async () => {
      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn()
        .mockResolvedValueOnce([{ id: 1, status: 'pending' }]) // Order check
        .mockResolvedValueOnce([  // Order items
          { product_id: 1, quantity: 2 },
          { product_id: 2, quantity: 1 }
        ])
        .mockResolvedValue(); // For subsequent operations

      const req = new Request('http://localhost/api/orders/1', {
        method: 'DELETE'
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe('Order cancelled successfully');
    });

    test('should return 400 when trying to cancel non-pending order', async () => {
      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn()
        .mockResolvedValueOnce([{ id: 1, status: 'completed' }]); // Order check

      const req = new Request('http://localhost/api/orders/1', {
        method: 'DELETE'
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Can only cancel pending orders');
    });
  });
});

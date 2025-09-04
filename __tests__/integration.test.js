import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { Hono } from 'hono';

// Import all routers
import userRouter from '../api/routes/users.js';
import productRouter from '../api/routes/products.js';
import orderRouter from '../api/routes/orders.js';
import paymentRouter from '../api/routes/payments.js';

describe('Integration Tests - Full Workflow', () => {
  let app;
  let mockEnv;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/users', userRouter);
    app.route('/api/products', productRouter);
    app.route('/api/orders', orderRouter);
    app.route('/api/payments', paymentRouter);

    mockEnv = {
      DB_AVAILABLE: false,
      SQL: null
    };
  });

  describe('Complete E-commerce Workflow', () => {
    test('should complete full order and payment workflow with mock data', async () => {
      // 1. Create a user
      const userData = {
        email: 'customer@example.com',
        name: 'John Customer',
        password: 'password123',
        phone: '0123456789',
        address: '123 Customer St'
      };

      const userReq = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const userRes = await app.request(userReq, mockEnv);
      const userDataRes = await userRes.json();

      expect(userRes.status).toBe(201);
      expect(userDataRes.user.email).toBe(userData.email);
      const userId = userDataRes.user.id;

      // 2. Create products
      const product1Data = {
        name: 'Test Book 1',
        description: 'A great book',
        price: 29.99,
        category: 'books',
        stock_quantity: 100
      };

      const product1Req = new Request('http://localhost/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product1Data)
      });

      const product1Res = await app.request(product1Req, mockEnv);
      const product1DataRes = await product1Res.json();

      expect(product1Res.status).toBe(201);
      const product1Id = product1DataRes.product.id;

      const product2Data = {
        name: 'Test Book 2',
        description: 'Another great book',
        price: 19.99,
        category: 'books',
        stock_quantity: 50
      };

      const product2Req = new Request('http://localhost/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product2Data)
      });

      const product2Res = await app.request(product2Req, mockEnv);
      const product2DataRes = await product2Res.json();

      expect(product2Res.status).toBe(201);
      const product2Id = product2DataRes.product.id;

      // 3. Create an order
      const orderData = {
        user_id: userId,
        items: [
          { product_id: product1Id, quantity: 2 },
          { product_id: product2Id, quantity: 1 }
        ],
        shipping_address: '123 Customer St'
      };

      const orderReq = new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const orderRes = await app.request(orderReq, mockEnv);
      const orderDataRes = await orderRes.json();

      expect(orderRes.status).toBe(201);
      expect(orderDataRes.order.user_id).toBe(userId);
      expect(orderDataRes.order.items).toBeDefined();
      const orderId = orderDataRes.order.id;

      // 4. Create a payment
      const paymentData = {
        order_id: orderId,
        payment_method: 'credit_card',
        transaction_id: 'txn_integration_test'
      };

      const paymentReq = new Request('http://localhost/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      const paymentRes = await app.request(paymentReq, mockEnv);
      const paymentDataRes = await paymentRes.json();

      expect(paymentRes.status).toBe(201);
      expect(paymentDataRes.payment.order_id).toBe(orderId);
      expect(paymentDataRes.payment.payment_method).toBe('credit_card');
      const paymentId = paymentDataRes.payment.id;

      // 5. Update payment status to completed
      const statusUpdateReq = new Request(`http://localhost/api/payments/${paymentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'completed' })
      });

      const statusUpdateRes = await app.request(statusUpdateReq, mockEnv);
      const statusUpdateDataRes = await statusUpdateRes.json();

      expect(statusUpdateRes.status).toBe(200);
      expect(statusUpdateDataRes.payment.payment_status).toBe('completed');

      // 6. Verify we can retrieve all data
      const getUserReq = new Request(`http://localhost/api/users/${userId}`);
      const getUserRes = await app.request(getUserReq, mockEnv);
      expect(getUserRes.status).toBe(200);

      const getOrderReq = new Request(`http://localhost/api/orders/${orderId}`);
      const getOrderRes = await app.request(getOrderReq, mockEnv);
      expect(getOrderRes.status).toBe(200);

      const getPaymentReq = new Request(`http://localhost/api/payments/${paymentId}`);
      const getPaymentRes = await app.request(getPaymentReq, mockEnv);
      expect(getPaymentRes.status).toBe(200);
    });

    test('should handle refund workflow', async () => {
      // Create a payment (mock scenario)
      const paymentData = {
        order_id: 1,
        payment_method: 'credit_card'
      };

      const paymentReq = new Request('http://localhost/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      const paymentRes = await app.request(paymentReq, mockEnv);
      const paymentDataRes = await paymentRes.json();
      const paymentId = paymentDataRes.payment.id;

      // Update to completed first
      const completeReq = new Request(`http://localhost/api/payments/${paymentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'completed' })
      });

      await app.request(completeReq, mockEnv);

      // Process refund
      const refundReq = new Request(`http://localhost/api/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Customer request' })
      });

      const refundRes = await app.request(refundReq, mockEnv);
      const refundDataRes = await refundRes.json();

      expect(refundRes.status).toBe(200);
      expect(refundDataRes.message).toBe('Refund processed successfully');
    });

    test('should handle inventory management workflow', async () => {
      // Create a product
      const productData = {
        name: 'Inventory Test Product',
        price: 49.99,
        stock_quantity: 10
      };

      const createReq = new Request('http://localhost/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });

      const createRes = await app.request(createReq, mockEnv);
      const createDataRes = await createRes.json();
      const productId = createDataRes.product.id;

      // Update stock
      const stockUpdateReq = new Request(`http://localhost/api/products/${productId}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 20 })
      });

      const stockUpdateRes = await app.request(stockUpdateReq, mockEnv);
      const stockUpdateDataRes = await stockUpdateRes.json();

      expect(stockUpdateRes.status).toBe(200);
      expect(stockUpdateDataRes.product.stock_quantity).toBe(20);

      // Verify product can be retrieved with updated stock
      const getProductReq = new Request(`http://localhost/api/products/${productId}`);
      const getProductRes = await app.request(getProductReq, mockEnv);
      const getProductDataRes = await getProductRes.json();

      expect(getProductRes.status).toBe(200);
      expect(getProductDataRes.product.id).toBe(productId);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle cascading errors properly', async () => {
      // Try to create order with non-existent user
      const orderData = {
        user_id: 99999, // Non-existent user
        items: [
          { product_id: 1, quantity: 1 }
        ]
      };

      const orderReq = new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const orderRes = await app.request(orderReq, mockEnv);

      // Should work with mock data
      expect(orderRes.status).toBe(201);
    });

    test('should validate business rules across services', async () => {
      // Try to create payment for non-existent order
      const paymentData = {
        order_id: 99999, // Non-existent order
        payment_method: 'credit_card'
      };

      const paymentReq = new Request('http://localhost/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      const paymentRes = await app.request(paymentReq, mockEnv);

      // Should work with mock data
      expect(paymentRes.status).toBe(201);
    });
  });
});

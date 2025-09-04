import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { Hono } from 'hono';
import productRouter from '../api/routes/products.js';

describe('Product Service Tests', () => {
  let app;
  let mockEnv;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/products', productRouter);

    mockEnv = {
      DB_AVAILABLE: false,
      SQL: null
    };
  });

  describe('GET /api/products', () => {
    test('should return mock products when DB not available', async () => {
      const req = new Request('http://localhost/api/products');
      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.products).toBeDefined();
      expect(Array.isArray(data.products)).toBe(true);
      expect(data.products.length).toBeGreaterThan(0);
    });

    test('should filter products by category', async () => {
      const mockProducts = [
        { id: 1, name: 'Product 1', category: 'electronics', price: 100 },
        { id: 2, name: 'Product 2', category: 'books', price: 20 }
      ];

      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockResolvedValue(mockProducts.filter(p => p.category === 'electronics'));

      const req = new Request('http://localhost/api/products?category=electronics');
      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.products).toHaveLength(1);
      expect(data.products[0].category).toBe('electronics');
    });

    test('should filter products by active status', async () => {
      const mockProducts = [
        { id: 1, name: 'Product 1', is_active: true },
        { id: 2, name: 'Product 2', is_active: false }
      ];

      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockResolvedValue(mockProducts.filter(p => p.is_active));

      const req = new Request('http://localhost/api/products?active=true');
      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.products).toHaveLength(1);
      expect(data.products[0].is_active).toBe(true);
    });
  });

  describe('GET /api/products/:id', () => {
    test('should return product by ID', async () => {
      const req = new Request('http://localhost/api/products/1');
      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.product).toBeDefined();
      expect(data.product.id).toBe(1);
    });

    test('should return 404 when product not found', async () => {
      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockResolvedValue([]);

      const req = new Request('http://localhost/api/products/999');
      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Product not found');
    });
  });

  describe('POST /api/products', () => {
    test('should create new product successfully', async () => {
      const productData = {
        name: 'New Product',
        description: 'Test description',
        price: 29.99,
        category: 'electronics',
        stock_quantity: 100
      };

      const req = new Request('http://localhost/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.product).toBeDefined();
      expect(data.product.name).toBe(productData.name);
      expect(data.product.price).toBe(productData.price);
    });

    test('should return 400 when required fields missing', async () => {
      const productData = {
        name: 'Product without price'
        // missing price
      };

      const req = new Request('http://localhost/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Name and price are required');
    });

    test('should return 400 when price is invalid', async () => {
      const productData = {
        name: 'Product',
        price: -10 // invalid price
      };

      const req = new Request('http://localhost/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Price must be greater than 0');
    });
  });

  describe('PUT /api/products/:id', () => {
    test('should update product successfully', async () => {
      const updateData = {
        name: 'Updated Product',
        price: 39.99,
        category: 'books',
        stock_quantity: 50
      };

      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockResolvedValue([
        { id: 1, ...updateData }
      ]);

      const req = new Request('http://localhost/api/products/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.product.name).toBe(updateData.name);
      expect(data.product.price).toBe(updateData.price);
    });

    test('should return 404 when product not found', async () => {
      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockResolvedValue([]);

      const updateData = {
        name: 'Updated Product',
        price: 39.99
      };

      const req = new Request('http://localhost/api/products/999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Product not found');
    });
  });

  describe('PUT /api/products/:id/stock', () => {
    test('should update stock quantity successfully', async () => {
      const stockData = { quantity: 150 };

      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockResolvedValue([
        { id: 1, stock_quantity: 150 }
      ]);

      const req = new Request('http://localhost/api/products/1/stock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockData)
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.product.stock_quantity).toBe(150);
    });

    test('should return 400 when quantity is invalid', async () => {
      const stockData = { quantity: -5 };

      const req = new Request('http://localhost/api/products/1/stock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockData)
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Valid quantity is required');
    });
  });

  describe('DELETE /api/products/:id', () => {
    test('should delete product successfully', async () => {
      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockResolvedValue({ count: 1 });

      const req = new Request('http://localhost/api/products/1', {
        method: 'DELETE'
      });

      const res = await app.request(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe('Product deleted successfully');
    });
  });
});

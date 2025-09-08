import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { Hono } from 'hono';
import userRouter from '../api/routes/users.js';

// Mock auth functions
jest.mock('../api/lib/auth.js', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password'),
  verifyPassword: jest.fn().mockResolvedValue(true),
  generateToken: jest.fn().mockReturnValue('mock_token')
}));

describe('User Service Tests', () => {
  let app;
  let mockEnv;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/users', userRouter);

    mockEnv = {
      DB_AVAILABLE: false,
      SQL: null
    };
  });

  describe('GET /api/users', () => {
    test('should return mock users when DB not available', async () => {
      const req = new Request('http://localhost/api/users');
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.users).toBeDefined();
      expect(Array.isArray(data.users)).toBe(true);
      expect(data.users.length).toBeGreaterThan(0);
    });

    test('should return users from database when available', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@example.com', name: 'John Doe' },
        { id: 2, email: 'user2@example.com', name: 'Jane Doe' }
      ];

      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockResolvedValue(mockUsers);

      const req = new Request('http://localhost/api/users');
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.users).toHaveLength(2);
      expect(data.users[0].email).toBe('user1@example.com');
      expect(data.users[0].name).toBe('John Doe');
    });

    test('should handle database errors gracefully', async () => {
      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockRejectedValue(new Error('DB Error'));

      const req = new Request('http://localhost/api/users');
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(res.ok).toBe(false);
    });
  });

  describe('GET /api/users/:id', () => {
    test('should return user by ID', async () => {
      const req = new Request('http://localhost/api/users/1');
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(1);
    });

    test('should return 404 when user not found in database', async () => {
      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockResolvedValue([]);

      const req = new Request('http://localhost/api/users/999');
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('User not found');
    });
  });

  describe('POST /api/users', () => {
    test('should create new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
        phone: '0123456789',
        address: '123 Test St'
      };

      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(userData.email);
      expect(data.user.name).toBe(userData.name);
    });

    test('should return 400 when required fields missing', async () => {
      const userData = {
        email: 'test@example.com'
        // missing name and password
      };

      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Email, name, and password are required');
    });

    test('should handle duplicate email error', async () => {
      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockRejectedValue(new Error('duplicate key'));

      const userData = {
        email: 'existing@example.com',
        name: 'Test User',
        password: 'password123'
      };

      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toBe('Email already exists');
    });
  });

  describe('PUT /api/users/:id', () => {
    test('should update user successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        phone: '0987654321',
        address: '456 Updated St'
      };

      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockResolvedValue([
        { id: 1, email: 'test@example.com', ...updateData }
      ]);

      const req = new Request('http://localhost/api/users/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.user.name).toBe(updateData.name);
    });

    test('should return 400 when name is missing', async () => {
      const updateData = {
        phone: '0987654321'
        // missing name
      };

      const req = new Request('http://localhost/api/users/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Name is required');
    });
  });

  describe('DELETE /api/users/:id', () => {
    test('should delete user successfully', async () => {
      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockResolvedValue({ count: 1 });

      const req = new Request('http://localhost/api/users/1', {
        method: 'DELETE'
      });

      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe('User deleted successfully');
    });

    test('should return 404 when user not found', async () => {
      mockEnv.DB_AVAILABLE = true;
      mockEnv.SQL = jest.fn().mockResolvedValue({ count: 0 });

      const req = new Request('http://localhost/api/users/999', {
        method: 'DELETE'
      });

      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('User not found');
    });
  });
});

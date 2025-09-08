import { jest } from '@jest/globals';
import { UserService } from '../services/userService.js';

describe('UserService', () => {
  let userService;
  let mockUserRepository;

  beforeEach(() => {
    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn()
    };
    userService = new UserService(mockUserRepository);
  });

  describe('createUser', () => {
    it('should create user successfully with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        phone: '0123456789',
        address: '123 Test St'
      };

      const expectedUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        phone: '0123456789',
        address: '123 Test St',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(expectedUser);

      const result = await userService.createUser(userData);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          name: 'Test User',
          phone: '0123456789',
          address: '123 Test St',
          password_hash: expect.any(String)
        })
      );
      expect(result).toEqual(expectedUser);
    });

    it('should throw error when email is missing', async () => {
      const userData = {
        name: 'Test User',
        password: 'password123'
      };

      await expect(userService.createUser(userData)).rejects.toThrow('Email, name và password là bắt buộc');
    });

    it('should throw error when name is missing', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      await expect(userService.createUser(userData)).rejects.toThrow('Email, name và password là bắt buộc');
    });

    it('should throw error when password is missing', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User'
      };

      await expect(userService.createUser(userData)).rejects.toThrow('Email, name và password là bắt buộc');
    });

    it('should throw error when email already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        name: 'Test User',
        password: 'password123'
      };

      const existingUser = {
        id: 1,
        email: 'existing@example.com',
        name: 'Existing User'
      };

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(userService.createUser(userData)).rejects.toThrow('Email đã tồn tại');
    });
  });

  describe('getUserById', () => {
    it('should return user without password hash when user exists', async () => {
      const userId = 1;
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed_password',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(user);

      const result = await userService.getUserById(userId);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        created_at: user.created_at,
        updated_at: user.updated_at
      });
      expect(result.password_hash).toBeUndefined();
    });

    it('should throw error when user does not exist', async () => {
      const userId = 999;
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserById(userId)).rejects.toThrow('Không tìm thấy user');
    });
  });

  describe('validateUser', () => {
    it('should return valid result when user exists', async () => {
      const userId = 1;
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User'
      };

      mockUserRepository.findById.mockResolvedValue(user);

      const result = await userService.validateUser(userId);

      expect(result).toEqual({
        isValid: true,
        user: { id: 1, email: 'test@example.com', name: 'Test User' }
      });
    });

    it('should return invalid result when user does not exist', async () => {
      const userId = 999;
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await userService.validateUser(userId);

      expect(result).toEqual({
        isValid: false,
        user: null
      });
    });
  });

  describe('updateUser', () => {
    it('should update user successfully when user exists', async () => {
      const userId = 1;
      const updateData = {
        name: 'Updated Name',
        phone: '0987654321',
        address: '456 Updated St'
      };

      const existingUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User'
      };

      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Updated Name',
        phone: '0987654321',
        address: '456 Updated St'
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser(userId, updateData);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should throw error when user does not exist', async () => {
      const userId = 999;
      const updateData = { name: 'Updated Name' };

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.updateUser(userId, updateData)).rejects.toThrow('Không tìm thấy user');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully when user exists', async () => {
      const userId = 1;

      mockUserRepository.exists.mockResolvedValue(true);
      mockUserRepository.delete.mockResolvedValue(true);

      const result = await userService.deleteUser(userId);

      expect(mockUserRepository.exists).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
      expect(result).toBe(true);
    });

    it('should throw error when user does not exist', async () => {
      const userId = 999;

      mockUserRepository.exists.mockResolvedValue(false);

      await expect(userService.deleteUser(userId)).rejects.toThrow('Không tìm thấy user');
    });
  });
});

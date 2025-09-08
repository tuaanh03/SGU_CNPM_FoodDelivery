import { jest } from '@jest/globals';
import { ProductService } from '../services/productService.js';

describe('ProductService', () => {
  let productService;
  let mockProductRepository;

  beforeEach(() => {
    mockProductRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      reserveStock: jest.fn(),
      commitStock: jest.fn(),
      releaseStock: jest.fn(),
      getAvailableStock: jest.fn(),
      cleanupExpiredReservations: jest.fn()
    };
    productService = new ProductService(mockProductRepository);
    // Clear timers
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('createProduct', () => {
    it('should create product successfully with valid data', async () => {
      const productData = {
        title: 'Test Book',
        author: 'Test Author',
        description: 'Test Description',
        price: 29.99,
        stock_quantity: 10,
        category: 'fiction'
      };

      const expectedProduct = {
        id: 1,
        ...productData,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockProductRepository.create.mockResolvedValue(expectedProduct);

      const result = await productService.createProduct(productData);

      expect(mockProductRepository.create).toHaveBeenCalledWith(productData);
      expect(result).toEqual(expectedProduct);
    });

    it('should throw error when title is missing', async () => {
      const productData = {
        price: 29.99,
        stock_quantity: 10
      };

      await expect(productService.createProduct(productData)).rejects.toThrow('Title, price và stock_quantity là bắt buộc');
    });

    it('should throw error when price is negative', async () => {
      const productData = {
        title: 'Test Book',
        price: -10,
        stock_quantity: 10
      };

      await expect(productService.createProduct(productData)).rejects.toThrow('Price phải lớn hơn 0');
    });

    it('should throw error when stock_quantity is negative', async () => {
      const productData = {
        title: 'Test Book',
        price: 29.99,
        stock_quantity: -5
      };

      await expect(productService.createProduct(productData)).rejects.toThrow('Title, price và stock_quantity là bắt buộc');
    });
  });

  describe('reserveStock', () => {
    it('should reserve stock successfully when stock is available', async () => {
      const productId = 1;
      const quantity = 2;
      const mockReservation = {
        reservationId: 'test-reservation-id',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      };

      mockProductRepository.findById.mockResolvedValue({
        id: 1,
        title: 'Test Book',
        stock_quantity: 10
      });
      mockProductRepository.reserveStock.mockResolvedValue(mockReservation);

      const result = await productService.reserveStock(productId, quantity);

      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.reserveStock).toHaveBeenCalledWith(productId, quantity);
      expect(result.success).toBe(true);
      expect(result.reservationId).toBe(mockReservation.reservationId);
    });

    it('should return error when product does not exist', async () => {
      const productId = 999;
      const quantity = 2;

      mockProductRepository.findById.mockResolvedValue(null);

      const result = await productService.reserveStock(productId, quantity);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Không tìm thấy product');
    });

    it('should return error when quantity is invalid', async () => {
      const productId = 1;
      const quantity = 0;

      const result = await productService.reserveStock(productId, quantity);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quantity phải lớn hơn 0');
    });

    it('should return error when stock is insufficient', async () => {
      const productId = 1;
      const quantity = 5;

      mockProductRepository.findById.mockResolvedValue({
        id: 1,
        title: 'Test Book',
        stock_quantity: 3
      });
      mockProductRepository.reserveStock.mockRejectedValue(new Error('Không đủ stock'));

      const result = await productService.reserveStock(productId, quantity);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Không đủ stock');
    });
  });

  describe('commitStock', () => {
    it('should commit stock successfully with valid reservation', async () => {
      const reservationId = 'test-reservation-id';

      mockProductRepository.commitStock.mockResolvedValue(true);

      const result = await productService.commitStock(reservationId);

      expect(mockProductRepository.commitStock).toHaveBeenCalledWith(reservationId);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Stock đã được commit thành công');
    });

    it('should return error when reservation does not exist', async () => {
      const reservationId = 'invalid-reservation-id';

      mockProductRepository.commitStock.mockRejectedValue(new Error('Reservation không tồn tại'));

      const result = await productService.commitStock(reservationId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Reservation không tồn tại');
    });

    it('should return error when reservation has expired', async () => {
      const reservationId = 'expired-reservation-id';

      mockProductRepository.commitStock.mockRejectedValue(new Error('Reservation đã hết hạn'));

      const result = await productService.commitStock(reservationId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Reservation đã hết hạn');
    });
  });

  describe('releaseStock', () => {
    it('should release stock successfully', async () => {
      const reservationId = 'test-reservation-id';

      mockProductRepository.releaseStock.mockResolvedValue(true);

      const result = await productService.releaseStock(reservationId);

      expect(mockProductRepository.releaseStock).toHaveBeenCalledWith(reservationId);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Stock đã được release thành công');
    });

    it('should return error when reservation does not exist', async () => {
      const reservationId = 'invalid-reservation-id';

      mockProductRepository.releaseStock.mockRejectedValue(new Error('Reservation không tồn tại'));

      const result = await productService.releaseStock(reservationId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Reservation không tồn tại');
    });
  });

  describe('getProductById', () => {
    it('should return product with available stock when product exists', async () => {
      const productId = 1;
      const product = {
        id: 1,
        title: 'Test Book',
        stock_quantity: 10,
        reserved_quantity: 2
      };

      const stockInfo = {
        total: 10,
        reserved: 2,
        available: 8
      };

      mockProductRepository.findById.mockResolvedValue(product);
      mockProductRepository.getAvailableStock.mockResolvedValue(stockInfo);

      const result = await productService.getProductById(productId);

      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.getAvailableStock).toHaveBeenCalledWith(productId);
      expect(result).toEqual({
        ...product,
        available_stock: 8
      });
    });

    it('should throw error when product does not exist', async () => {
      const productId = 999;

      mockProductRepository.findById.mockResolvedValue(null);

      await expect(productService.getProductById(productId)).rejects.toThrow('Không tìm thấy product');
    });
  });
});

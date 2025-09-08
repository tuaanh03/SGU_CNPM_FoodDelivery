export class ProductService {
  constructor(productRepository) {
    this.productRepository = productRepository;

    // Cleanup expired reservations mỗi 5 phút
    setInterval(() => {
      this.productRepository.cleanupExpiredReservations();
    }, 5 * 60 * 1000);
  }

  async createProduct(productData) {
    // Validate input
    if (!productData.title || !productData.price || productData.stock_quantity < 0) {
      throw new Error('Title, price và stock_quantity là bắt buộc');
    }

    if (productData.price < 0) {
      throw new Error('Price phải lớn hơn 0');
    }

    return await this.productRepository.create(productData);
  }

  async getProductById(id) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new Error('Không tìm thấy product');
    }

    // Thêm thông tin available stock
    const stockInfo = await this.productRepository.getAvailableStock(id);
    return {
      ...product,
      available_stock: stockInfo.available
    };
  }

  async getAllProducts() {
    const products = await this.productRepository.findAll();

    // Thêm thông tin available stock cho tất cả products
    const productsWithStock = await Promise.all(
      products.map(async (product) => {
        const stockInfo = await this.productRepository.getAvailableStock(product.id);
        return {
          ...product,
          available_stock: stockInfo.available
        };
      })
    );

    return productsWithStock;
  }

  async updateProduct(id, productData) {
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new Error('Không tìm thấy product');
    }

    if (productData.price && productData.price < 0) {
      throw new Error('Price phải lớn hơn 0');
    }

    if (productData.stock_quantity && productData.stock_quantity < 0) {
      throw new Error('Stock quantity phải lớn hơn hoặc bằng 0');
    }

    return await this.productRepository.update(id, productData);
  }

  async deleteProduct(id) {
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new Error('Không tìm thấy product');
    }

    return await this.productRepository.delete(id);
  }

  async reserveStock(productId, quantity) {
    if (quantity <= 0) {
      throw new Error('Quantity phải lớn hơn 0');
    }

    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new Error('Không tìm thấy product');
    }

    try {
      const reservation = await this.productRepository.reserveStock(productId, quantity);
      return {
        success: true,
        reservationId: reservation.reservationId,
        expiresAt: reservation.expiresAt,
        message: `Đã reserve ${quantity} items cho product ${productId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async commitStock(reservationId) {
    try {
      await this.productRepository.commitStock(reservationId);
      return {
        success: true,
        message: 'Stock đã được commit thành công'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async releaseStock(reservationId) {
    try {
      await this.productRepository.releaseStock(reservationId);
      return {
        success: true,
        message: 'Stock đã được release thành công'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getStockInfo(productId) {
    const stockInfo = await this.productRepository.getAvailableStock(productId);
    if (!stockInfo) {
      throw new Error('Không tìm thấy product');
    }

    return stockInfo;
  }
}

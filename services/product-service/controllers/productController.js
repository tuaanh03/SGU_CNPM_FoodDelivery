export class ProductController {
  constructor(productService) {
    this.productService = productService;
  }

  async createProduct(req, res) {
    try {
      const product = await this.productService.createProduct(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getProductById(req, res) {
    try {
      const product = await this.productService.getProductById(req.params.id);
      res.json({ success: true, data: product });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  async getAllProducts(req, res) {
    try {
      const products = await this.productService.getAllProducts();
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateProduct(req, res) {
    try {
      const product = await this.productService.updateProduct(req.params.id, req.body);
      res.json({ success: true, data: product });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async deleteProduct(req, res) {
    try {
      await this.productService.deleteProduct(req.params.id);
      res.json({ success: true, message: 'Product đã được xóa' });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  async reserveStock(req, res) {
    try {
      const { productId, quantity } = req.body;
      const result = await this.productService.reserveStock(productId, quantity);

      if (result.success) {
        res.json({ success: true, data: result });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async commitStock(req, res) {
    try {
      const { reservationId } = req.body;
      const result = await this.productService.commitStock(reservationId);

      if (result.success) {
        res.json({ success: true, data: result });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async releaseStock(req, res) {
    try {
      const { reservationId } = req.body;
      const result = await this.productService.releaseStock(reservationId);

      if (result.success) {
        res.json({ success: true, data: result });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

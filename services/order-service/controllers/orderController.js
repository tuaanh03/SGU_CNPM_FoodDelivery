export class OrderController {
  constructor(orderService) {
    this.orderService = orderService;
  }

  async createOrder(req, res) {
    try {
      const order = await this.orderService.createOrder(req.body);
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getOrderById(req, res) {
    try {
      const order = await this.orderService.getOrderById(req.params.id);
      res.json({ success: true, data: order });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  async getAllOrders(req, res) {
    try {
      const orders = await this.orderService.getAllOrders();
      res.json({ success: true, data: orders });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getOrdersByUserId(req, res) {
    try {
      const orders = await this.orderService.getOrdersByUserId(req.params.userId);
      res.json({ success: true, data: orders });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async cancelOrder(req, res) {
    try {
      const order = await this.orderService.cancelOrder(req.params.id);
      res.json({ success: true, data: order });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

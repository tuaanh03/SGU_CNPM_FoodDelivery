export class PaymentController {
  constructor(paymentService) {
    this.paymentService = paymentService;
  }

  async authorizePayment(req, res) {
    try {
      const result = await this.paymentService.authorizePayment(req.body);

      if (result.success) {
        res.status(201).json({ success: true, data: result });
      } else {
        res.status(400).json({ success: false, error: result.error, data: result.payment });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async capturePayment(req, res) {
    try {
      const { paymentId, amount } = req.body;
      const result = await this.paymentService.capturePayment(paymentId, amount);

      if (result.success) {
        res.json({ success: true, data: result });
      } else {
        res.status(400).json({ success: false, error: result.error, data: result.payment });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async cancelPayment(req, res) {
    try {
      const { paymentId, reason } = req.body;
      const result = await this.paymentService.cancelPayment(paymentId, reason);

      if (result.success) {
        res.json({ success: true, data: result });
      } else {
        res.status(400).json({ success: false, error: result.error, data: result.payment });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPaymentById(req, res) {
    try {
      const payment = await this.paymentService.getPaymentById(req.params.id);
      res.json({ success: true, data: payment });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  async getAllPayments(req, res) {
    try {
      const payments = await this.paymentService.getAllPayments();
      res.json({ success: true, data: payments });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

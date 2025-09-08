export class PaymentService {
  constructor(paymentRepository) {
    this.paymentRepository = paymentRepository;
  }

  async authorizePayment(paymentData) {
    // Validate input
    if (!paymentData.order_id || !paymentData.user_id || !paymentData.amount) {
      throw new Error('Order ID, User ID và amount là bắt buộc');
    }

    if (paymentData.amount <= 0) {
      throw new Error('Amount phải lớn hơn 0');
    }

    // Tạo payment record
    const payment = await this.paymentRepository.create(paymentData);

    try {
      // Simulate payment gateway authorization
      const authResult = await this.simulatePaymentGateway('authorize', {
        amount: paymentData.amount,
        currency: paymentData.currency || 'VND',
        payment_method: paymentData.payment_method
      });

      if (authResult.success) {
        // Cập nhật payment status thành authorized
        const updatedPayment = await this.paymentRepository.updateStatus(
          payment.payment_id,
          'authorized',
          { authorization_id: authResult.authorization_id }
        );

        // Log transaction
        await this.paymentRepository.addTransaction(
          payment.payment_id,
          'authorize',
          paymentData.amount,
          'success',
          authResult
        );

        return {
          success: true,
          payment: updatedPayment,
          authorization_id: authResult.authorization_id
        };
      } else {
        // Payment authorization failed
        await this.paymentRepository.updateStatus(
          payment.payment_id,
          'failed',
          { failure_reason: authResult.error }
        );

        await this.paymentRepository.addTransaction(
          payment.payment_id,
          'authorize',
          paymentData.amount,
          'failed',
          authResult
        );

        return {
          success: false,
          error: authResult.error,
          payment: await this.paymentRepository.findByPaymentId(payment.payment_id)
        };
      }
    } catch (error) {
      await this.paymentRepository.updateStatus(
        payment.payment_id,
        'failed',
        { failure_reason: error.message }
      );

      return {
        success: false,
        error: error.message,
        payment: await this.paymentRepository.findByPaymentId(payment.payment_id)
      };
    }
  }

  async capturePayment(paymentId, captureAmount = null) {
    const payment = await this.paymentRepository.findByPaymentId(paymentId);

    if (!payment) {
      throw new Error('Payment không tồn tại');
    }

    if (payment.status !== 'authorized') {
      throw new Error(`Không thể capture payment với status: ${payment.status}`);
    }

    const amountToCapture = captureAmount || payment.amount;

    if (amountToCapture > payment.amount) {
      throw new Error('Capture amount không thể lớn hơn authorized amount');
    }

    try {
      // Simulate payment gateway capture
      const captureResult = await this.simulatePaymentGateway('capture', {
        authorization_id: payment.authorization_id,
        amount: amountToCapture,
        currency: payment.currency
      });

      if (captureResult.success) {
        const updatedPayment = await this.paymentRepository.updateStatus(
          paymentId,
          'captured',
          { capture_id: captureResult.capture_id }
        );

        await this.paymentRepository.addTransaction(
          paymentId,
          'capture',
          amountToCapture,
          'success',
          captureResult
        );

        return {
          success: true,
          payment: updatedPayment,
          capture_id: captureResult.capture_id
        };
      } else {
        await this.paymentRepository.updateStatus(
          paymentId,
          'failed',
          { failure_reason: captureResult.error }
        );

        await this.paymentRepository.addTransaction(
          paymentId,
          'capture',
          amountToCapture,
          'failed',
          captureResult
        );

        return {
          success: false,
          error: captureResult.error,
          payment: await this.paymentRepository.findByPaymentId(paymentId)
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        payment: await this.paymentRepository.findByPaymentId(paymentId)
      };
    }
  }

  async cancelPayment(paymentId, reason = 'Cancelled by user') {
    const payment = await this.paymentRepository.findByPaymentId(paymentId);

    if (!payment) {
      throw new Error('Payment không tồn tại');
    }

    if (!['pending', 'authorized'].includes(payment.status)) {
      throw new Error(`Không thể cancel payment với status: ${payment.status}`);
    }

    try {
      // Simulate payment gateway cancellation
      const cancelResult = await this.simulatePaymentGateway('cancel', {
        authorization_id: payment.authorization_id,
        reason: reason
      });

      if (cancelResult.success) {
        const updatedPayment = await this.paymentRepository.updateStatus(
          paymentId,
          'cancelled',
          { failure_reason: reason }
        );

        await this.paymentRepository.addTransaction(
          paymentId,
          'cancel',
          payment.amount,
          'success',
          cancelResult
        );

        return {
          success: true,
          payment: updatedPayment
        };
      } else {
        return {
          success: false,
          error: cancelResult.error,
          payment: payment
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        payment: payment
      };
    }
  }

  async getPaymentById(paymentId) {
    const payment = await this.paymentRepository.findByPaymentId(paymentId);

    if (!payment) {
      throw new Error('Payment không tồn tại');
    }

    const transactions = await this.paymentRepository.getTransactions(paymentId);

    return {
      ...payment,
      transactions
    };
  }

  async getAllPayments() {
    return await this.paymentRepository.findAll();
  }

  async getPaymentsByOrderId(orderId) {
    return await this.paymentRepository.findByOrderId(orderId);
  }

  // Simulate payment gateway responses
  async simulatePaymentGateway(operation, data) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    // Simulate different scenarios based on amount or other factors
    const shouldFail = Math.random() < 0.1; // 10% failure rate

    switch (operation) {
      case 'authorize':
        if (shouldFail || data.amount > 10000000) { // Fail for very large amounts
          return {
            success: false,
            error: 'Authorization failed: Insufficient funds or invalid card'
          };
        }
        return {
          success: true,
          authorization_id: `auth_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          gateway_response: 'Authorization successful'
        };

      case 'capture':
        if (shouldFail) {
          return {
            success: false,
            error: 'Capture failed: Authorization expired or invalid'
          };
        }
        return {
          success: true,
          capture_id: `cap_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          gateway_response: 'Capture successful'
        };

      case 'cancel':
        return {
          success: true,
          gateway_response: 'Cancellation successful'
        };

      default:
        return {
          success: false,
          error: 'Unknown operation'
        };
    }
  }
}

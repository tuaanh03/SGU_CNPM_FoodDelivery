import axios from 'axios';

export class OrderService {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;

    // Service URLs - có thể config từ environment variables
    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
    this.productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
    this.paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003';
  }

  async createOrder(orderData) {
    // Validate input
    if (!orderData.user_id || !orderData.items || orderData.items.length === 0) {
      throw new Error('User ID và items là bắt buộc');
    }

    // Calculate total amount
    const totalAmount = orderData.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);

    const orderToCreate = {
      ...orderData,
      total_amount: totalAmount
    };

    // Tạo order và bắt đầu saga
    const order = await this.orderRepository.create(orderToCreate);

    // Bắt đầu saga orchestration
    await this.runOrderSaga(order.order_id);

    return order;
  }

  async runOrderSaga(orderId) {
    const sagaSteps = [
      'validate_user',
      'reserve_stock',
      'authorize_payment',
      'capture_payment',
      'commit_stock',
      'confirm_order'
    ];

    let sagaState = await this.orderRepository.getSagaState(orderId);

    try {
      for (const step of sagaSteps) {
        // Skip if step already completed
        if (sagaState.completed_steps.includes(step)) {
          continue;
        }

        // Update current step
        await this.orderRepository.updateSagaState(
          orderId,
          step,
          sagaState.completed_steps,
          sagaState.saga_data
        );

        // Execute step
        const stepResult = await this.executeStep(step, orderId, sagaState.saga_data);

        if (!stepResult.success) {
          // Step failed - start compensation
          await this.handleSagaFailure(orderId, step, stepResult.error, sagaState);
          return;
        }

        // Step succeeded - update state
        sagaState.completed_steps.push(step);
        sagaState.saga_data = { ...sagaState.saga_data, ...stepResult.data };

        await this.orderRepository.updateSagaState(
          orderId,
          step,
          sagaState.completed_steps,
          sagaState.saga_data
        );
      }

      // All steps completed successfully
      await this.orderRepository.updateStatus(orderId, 'confirmed', {
        payment_id: sagaState.saga_data.payment_id
      });

      // Clean up saga state
      await this.orderRepository.deleteSagaState(orderId);

    } catch (error) {
      console.error(`Saga execution error for order ${orderId}:`, error);
      await this.handleSagaFailure(orderId, sagaState.current_step, error.message, sagaState);
    }
  }

  async executeStep(step, orderId, sagaData) {
    try {
      switch (step) {
        case 'validate_user':
          return await this.validateUser(sagaData.user_id);

        case 'reserve_stock':
          return await this.reserveStock(sagaData.items);

        case 'authorize_payment':
          return await this.authorizePayment(orderId, sagaData);

        case 'capture_payment':
          return await this.capturePayment(sagaData.payment_id);

        case 'commit_stock':
          return await this.commitStock(sagaData.reservations);

        case 'confirm_order':
          return { success: true, data: {} };

        default:
          throw new Error(`Unknown saga step: ${step}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async validateUser(userId) {
    try {
      const response = await axios.post(`${this.userServiceUrl}/users/validate`, {
        userId: userId
      });

      if (response.data.success && response.data.data.isValid) {
        return {
          success: true,
          data: {
            validated_user: response.data.data.user
          }
        };
      } else {
        return {
          success: false,
          error: 'User không hợp lệ'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `User validation failed: ${error.message}`
      };
    }
  }

  async reserveStock(items) {
    const reservations = [];

    try {
      for (const item of items) {
        const response = await axios.post(`${this.productServiceUrl}/products/reserve`, {
          productId: item.product_id,
          quantity: item.quantity
        });

        if (response.data.success) {
          reservations.push({
            product_id: item.product_id,
            quantity: item.quantity,
            reservation_id: response.data.data.reservationId
          });
        } else {
          // If any reservation fails, release all previous reservations
          await this.releaseReservations(reservations);
          return {
            success: false,
            error: `Không thể reserve stock cho product ${item.product_id}: ${response.data.error}`
          };
        }
      }

      return {
        success: true,
        data: {
          reservations: reservations
        }
      };
    } catch (error) {
      // Release any successful reservations
      await this.releaseReservations(reservations);
      return {
        success: false,
        error: `Stock reservation failed: ${error.message}`
      };
    }
  }

  async authorizePayment(orderId, sagaData) {
    try {
      const order = await this.orderRepository.findByOrderId(orderId);

      const response = await axios.post(`${this.paymentServiceUrl}/payments/authorize`, {
        order_id: orderId,
        user_id: sagaData.user_id,
        amount: order.total_amount,
        currency: order.currency,
        payment_method: sagaData.payment_method || 'credit_card'
      });

      if (response.data.success) {
        return {
          success: true,
          data: {
            payment_id: response.data.data.payment.payment_id,
            authorization_id: response.data.data.authorization_id
          }
        };
      } else {
        return {
          success: false,
          error: `Payment authorization failed: ${response.data.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Payment authorization failed: ${error.message}`
      };
    }
  }

  async capturePayment(paymentId) {
    try {
      const response = await axios.post(`${this.paymentServiceUrl}/payments/capture`, {
        paymentId: paymentId
      });

      if (response.data.success) {
        return {
          success: true,
          data: {
            capture_id: response.data.data.capture_id
          }
        };
      } else {
        return {
          success: false,
          error: `Payment capture failed: ${response.data.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Payment capture failed: ${error.message}`
      };
    }
  }

  async commitStock(reservations) {
    try {
      for (const reservation of reservations) {
        const response = await axios.post(`${this.productServiceUrl}/products/commit`, {
          reservationId: reservation.reservation_id
        });

        if (!response.data.success) {
          return {
            success: false,
            error: `Failed to commit stock for reservation ${reservation.reservation_id}: ${response.data.error}`
          };
        }
      }

      return {
        success: true,
        data: {}
      };
    } catch (error) {
      return {
        success: false,
        error: `Stock commit failed: ${error.message}`
      };
    }
  }

  async handleSagaFailure(orderId, failedStep, error, sagaState) {
    console.log(`Saga failed at step ${failedStep} for order ${orderId}: ${error}`);

    // Update order status to failed
    await this.orderRepository.updateStatus(orderId, 'failed');

    // Execute compensation actions
    const compensationSteps = this.getCompensationSteps(sagaState.completed_steps);

    await this.orderRepository.updateSagaState(
      orderId,
      failedStep,
      sagaState.completed_steps,
      sagaState.saga_data,
      failedStep,
      compensationSteps
    );

    // Execute compensations
    await this.executeCompensations(compensationSteps, sagaState.saga_data);
  }

  getCompensationSteps(completedSteps) {
    const compensationMap = {
      'reserve_stock': 'release_stock',
      'authorize_payment': 'cancel_payment',
      'capture_payment': 'cancel_payment', // In real world, this might be refund
      'commit_stock': 'release_stock' // This shouldn't happen as commit is usually final
    };

    return completedSteps
      .reverse()
      .map(step => compensationMap[step])
      .filter(Boolean);
  }

  async executeCompensations(compensationSteps, sagaData) {
    for (const step of compensationSteps) {
      try {
        switch (step) {
          case 'release_stock':
            if (sagaData.reservations) {
              await this.releaseReservations(sagaData.reservations);
            }
            break;

          case 'cancel_payment':
            if (sagaData.payment_id) {
              await axios.post(`${this.paymentServiceUrl}/payments/cancel`, {
                paymentId: sagaData.payment_id,
                reason: 'Order saga failed'
              });
            }
            break;
        }
      } catch (error) {
        console.error(`Compensation step ${step} failed:`, error);
      }
    }
  }

  async releaseReservations(reservations) {
    for (const reservation of reservations) {
      try {
        await axios.post(`${this.productServiceUrl}/products/release`, {
          reservationId: reservation.reservation_id
        });
      } catch (error) {
        console.error(`Failed to release reservation ${reservation.reservation_id}:`, error);
      }
    }
  }

  async getOrderById(orderId) {
    const order = await this.orderRepository.findByOrderId(orderId);
    if (!order) {
      throw new Error('Order không tồn tại');
    }
    return order;
  }

  async getAllOrders() {
    return await this.orderRepository.findAll();
  }

  async getOrdersByUserId(userId) {
    return await this.orderRepository.findByUserId(userId);
  }

  async cancelOrder(orderId) {
    const order = await this.orderRepository.findByOrderId(orderId);

    if (!order) {
      throw new Error('Order không tồn tại');
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new Error(`Không thể cancel order với status: ${order.status}`);
    }

    // Get saga state to perform compensations if needed
    const sagaState = await this.orderRepository.getSagaState(orderId);

    if (sagaState) {
      // Execute compensations
      const compensationSteps = this.getCompensationSteps(sagaState.completed_steps);
      await this.executeCompensations(compensationSteps, sagaState.saga_data);

      // Clean up saga state
      await this.orderRepository.deleteSagaState(orderId);
    }

    // Update order status
    return await this.orderRepository.updateStatus(orderId, 'cancelled');
  }
}

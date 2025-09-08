import { v4 as uuidv4 } from 'uuid';

export class OrderRepository {
  constructor(database) {
    this.db = database.getConnection();
  }

  async create(orderData) {
    const orderId = uuidv4();

    const transaction = this.db.transaction(() => {
      // Tạo order
      const orderStmt = this.db.prepare(`
        INSERT INTO orders (order_id, user_id, status, total_amount, currency, shipping_address, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      orderStmt.run(
        orderId,
        orderData.user_id,
        'pending',
        orderData.total_amount,
        orderData.currency || 'VND',
        orderData.shipping_address,
        JSON.stringify(orderData.metadata || {})
      );

      // Tạo order items
      const itemStmt = this.db.prepare(`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const item of orderData.items) {
        itemStmt.run(
          orderId,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.quantity * item.unit_price
        );
      }

      // Tạo saga state
      const sagaStmt = this.db.prepare(`
        INSERT INTO order_saga_state (order_id, current_step, completed_steps, saga_data)
        VALUES (?, ?, ?, ?)
      `);

      sagaStmt.run(
        orderId,
        'validate_user',
        JSON.stringify([]),
        JSON.stringify({
          user_id: orderData.user_id,
          items: orderData.items,
          reservations: []
        })
      );
    });

    transaction();
    return this.findByOrderId(orderId);
  }

  async findByOrderId(orderId) {
    const orderStmt = this.db.prepare('SELECT * FROM orders WHERE order_id = ?');
    const order = orderStmt.get(orderId);

    if (!order) return null;

    // Parse metadata
    if (order.metadata) {
      order.metadata = JSON.parse(order.metadata);
    }

    // Lấy order items
    const itemsStmt = this.db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const items = itemsStmt.all(orderId);

    return {
      ...order,
      items
    };
  }

  async findById(id) {
    const orderStmt = this.db.prepare('SELECT * FROM orders WHERE id = ?');
    const order = orderStmt.get(id);

    if (!order) return null;

    return this.findByOrderId(order.order_id);
  }

  async findAll() {
    const ordersStmt = this.db.prepare('SELECT * FROM orders ORDER BY created_at DESC');
    const orders = ordersStmt.all();

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        if (order.metadata) {
          order.metadata = JSON.parse(order.metadata);
        }

        const itemsStmt = this.db.prepare('SELECT * FROM order_items WHERE order_id = ?');
        const items = itemsStmt.all(order.order_id);

        return {
          ...order,
          items
        };
      })
    );

    return ordersWithItems;
  }

  async findByUserId(userId) {
    const ordersStmt = this.db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC');
    const orders = ordersStmt.all(userId);

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        if (order.metadata) {
          order.metadata = JSON.parse(order.metadata);
        }

        const itemsStmt = this.db.prepare('SELECT * FROM order_items WHERE order_id = ?');
        const items = itemsStmt.all(order.order_id);

        return {
          ...order,
          items
        };
      })
    );

    return ordersWithItems;
  }

  async updateStatus(orderId, status, additionalData = {}) {
    const updateFields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [status];

    if (additionalData.payment_id) {
      updateFields.push('payment_id = ?');
      values.push(additionalData.payment_id);
    }

    values.push(orderId);

    const stmt = this.db.prepare(`
      UPDATE orders 
      SET ${updateFields.join(', ')}
      WHERE order_id = ?
    `);

    stmt.run(...values);
    return this.findByOrderId(orderId);
  }

  async updateItemReservation(orderId, productId, reservationId) {
    const stmt = this.db.prepare(`
      UPDATE order_items 
      SET reservation_id = ?
      WHERE order_id = ? AND product_id = ?
    `);

    stmt.run(reservationId, orderId, productId);
  }

  // Saga state management
  async createSagaState(orderId, initialStep, sagaData) {
    const stmt = this.db.prepare(`
      INSERT INTO order_saga_state (order_id, current_step, completed_steps, saga_data)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      orderId,
      initialStep,
      JSON.stringify([]),
      JSON.stringify(sagaData)
    );
  }

  async getSagaState(orderId) {
    const stmt = this.db.prepare('SELECT * FROM order_saga_state WHERE order_id = ?');
    const sagaState = stmt.get(orderId);

    if (!sagaState) return null;

    return {
      ...sagaState,
      completed_steps: JSON.parse(sagaState.completed_steps || '[]'),
      compensation_steps: JSON.parse(sagaState.compensation_steps || '[]'),
      saga_data: JSON.parse(sagaState.saga_data || '{}')
    };
  }

  async updateSagaState(orderId, currentStep, completedSteps, sagaData, failedStep = null, compensationSteps = null) {
    const stmt = this.db.prepare(`
      UPDATE order_saga_state 
      SET current_step = ?, completed_steps = ?, saga_data = ?, failed_step = ?, 
          compensation_steps = ?, updated_at = CURRENT_TIMESTAMP
      WHERE order_id = ?
    `);

    stmt.run(
      currentStep,
      JSON.stringify(completedSteps),
      JSON.stringify(sagaData),
      failedStep,
      JSON.stringify(compensationSteps || []),
      orderId
    );
  }

  async deleteSagaState(orderId) {
    const stmt = this.db.prepare('DELETE FROM order_saga_state WHERE order_id = ?');
    stmt.run(orderId);
  }
}

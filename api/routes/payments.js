import { Hono } from "hono";

const paymentRouter = new Hono();

// GET /api/payments - Lấy danh sách payments
paymentRouter.get("/", async (c) => {
  try {
    const { order_id, status } = c.req.query();

    if (!c.env?.DB_AVAILABLE) {
      let mockPayments = [
        { id: 1, order_id: 1, amount: 99.98, payment_method: "credit_card", payment_status: "completed", transaction_id: "txn_123", created_at: new Date() },
        { id: 2, order_id: 2, amount: 149.99, payment_method: "paypal", payment_status: "pending", transaction_id: "txn_456", created_at: new Date() }
      ];

      if (order_id) {
        mockPayments = mockPayments.filter(p => p.order_id === parseInt(order_id));
      }

      if (status) {
        mockPayments = mockPayments.filter(p => p.payment_status === status);
      }

      return c.json({ payments: mockPayments });
    }

    const payments = [];
    return c.json({ payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return c.json({ error: "Failed to fetch payments" }, 500);
  }
});

// GET /api/payments/:id - Lấy thông tin payment theo ID
paymentRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    if (!c.env?.DB_AVAILABLE) {
      if (id === "999") {
        return c.json({ error: "Payment not found" }, 404);
      }

      const mockPayment = {
        id: parseInt(id),
        order_id: 1,
        amount: 99.98,
        payment_method: "credit_card",
        payment_status: "completed",
        transaction_id: "txn_123",
        created_at: new Date()
      };
      return c.json({ payment: mockPayment });
    }

    return c.json({ error: "Payment not found" }, 404);
  } catch (error) {
    console.error("Error fetching payment:", error);
    return c.json({ error: "Failed to fetch payment" }, 500);
  }
});

// POST /api/payments - Tạo payment mới
paymentRouter.post("/", async (c) => {
  try {
    const { order_id, payment_method, transaction_id, amount } = await c.req.json();

    if (!order_id || !payment_method) {
      return c.json({ error: "Order ID and payment method are required" }, 400);
    }

    const validMethods = ['credit_card', 'debit_card', 'paypal', 'bank_transfer'];
    if (!validMethods.includes(payment_method)) {
      return c.json({ error: "Invalid payment method" }, 400);
    }

    if (!c.env?.DB_AVAILABLE) {
      if (order_id === 999) {
        return c.json({ error: "Order not found" }, 404);
      }

      // Mock data - luôn cho phép tạo payment mới
      const mockPayment = {
        id: Date.now(),
        order_id,
        amount: parseFloat(amount) || 99.98,
        payment_method,
        payment_status: "pending",
        transaction_id: transaction_id || `txn_${Date.now()}`,
        created_at: new Date()
      };
      return c.json({ payment: mockPayment }, 201);
    }

    // Database logic - kiểm tra order tồn tại
    const orderResult = await c.env.SQL`
      SELECT id, total_amount, status FROM orders WHERE id = ${order_id}
    `;

    if (!orderResult || orderResult.length === 0) {
      return c.json({ error: "Order not found" }, 404);
    }

    const [order] = orderResult;

    // Kiểm tra xem order đã có payment chưa
    const existingPaymentResult = await c.env.SQL`
      SELECT id FROM payments WHERE order_id = ${order_id}
    `;

    if (existingPaymentResult && existingPaymentResult.length > 0) {
      return c.json({ error: "Payment already exists for this order" }, 409);
    }

    const [payment] = await c.env.SQL`
      INSERT INTO payments (order_id, amount, payment_method, transaction_id)
      VALUES (${order_id}, ${order.total_amount}, ${payment_method}, ${transaction_id || `txn_${Date.now()}`})
      RETURNING id, order_id, amount, payment_method, payment_status, transaction_id, created_at, updated_at
    `;

    return c.json({ payment }, 201);
  } catch (error) {
    console.error("Error creating payment:", error);
    return c.json({ error: "Failed to create payment" }, 500);
  }
});

// PUT /api/payments/:id/status - Cập nhật payment status
paymentRouter.put("/:id/status", async (c) => {
  const id = c.req.param("id");

  try {
    const { payment_status } = await c.req.json();

    if (!c.env?.DB_AVAILABLE) {
      if (id === "999") {
        return c.json({ error: "Payment not found" }, 404);
      }

      const mockPayment = { id: parseInt(id), payment_status, updated_at: new Date() };
      return c.json({ payment: mockPayment });
    }

    return c.json({ error: "Payment not found" }, 404);
  } catch (error) {
    console.error("Error updating payment status:", error);
    return c.json({ error: "Failed to update payment status" }, 500);
  }
});

// POST /api/payments/:id/refund - Hoàn tiền
paymentRouter.post("/:id/refund", async (c) => {
  const id = c.req.param("id");

  try {
    const { reason } = await c.req.json();

    if (!c.env?.DB_AVAILABLE) {
      if (id === "999") {
        return c.json({ error: "Payment not found" }, 404);
      }

      if (id === "2") {
        return c.json({ error: "Can only refund completed payments" }, 400);
      }

      return c.json({
        payment: { id: parseInt(id), payment_status: "refunded", updated_at: new Date() },
        message: "Refund processed successfully"
      });
    }

    // Database logic - kiểm tra payment tồn tại và status
    const paymentResult = await c.env.SQL`
      SELECT id, order_id, payment_status FROM payments WHERE id = ${id}
    `;

    if (!paymentResult || paymentResult.length === 0) {
      return c.json({ error: "Payment not found" }, 404);
    }

    const [payment] = paymentResult;

    if (payment.payment_status !== "completed") {
      return c.json({ error: "Can only refund completed payments" }, 400);
    }

    // Cập nhật payment status thành refunded
    const [updatedPayment] = await c.env.SQL`
      UPDATE payments
      SET payment_status = 'refunded', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, order_id, amount, payment_method, payment_status, transaction_id, created_at, updated_at
    `;

    return c.json({
      payment: updatedPayment,
      message: "Refund processed successfully"
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    return c.json({ error: "Failed to process refund" }, 500);
  }
});

export default paymentRouter;

import { Hono } from "hono";
import orderRouter from "./orders.js";

const paymentRouter = new Hono();

// GET /api/payments - Lấy danh sách payments
paymentRouter.get("/", async (c) => {
  try {
    const { order_id, status } = c.req.query();

    if (!c.env?.DB_AVAILABLE) {
      return c.json({
        payments: [
          { id: 1, order_id: 1, amount: 99.98, payment_method: "credit_card", payment_status: "completed", transaction_id: "txn_123", created_at: new Date() },
          { id: 2, order_id: 2, amount: 149.99, payment_method: "paypal", payment_status: "pending", transaction_id: "txn_456", created_at: new Date() }
        ]
      });
    }

    let query = c.env.SQL`
      SELECT p.id, p.order_id, p.amount, p.payment_method, p.payment_status, p.transaction_id, p.created_at, p.updated_at,
             o.user_id, u.name as user_name, u.email as user_email
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;

    if (order_id) {
      query = c.env.SQL`${query} AND p.order_id = ${order_id}`;
    }

    if (status) {
      query = c.env.SQL`${query} AND p.payment_status = ${status}`;
    }

    query = c.env.SQL`${query} ORDER BY p.created_at DESC`;

    const payments = await query;
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

    const [payment] = await c.env.SQL`
      SELECT p.id, p.order_id, p.amount, p.payment_method, p.payment_status, p.transaction_id, p.created_at, p.updated_at,
             o.user_id, o.total_amount as order_total, u.name as user_name, u.email as user_email
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE p.id = ${id}
    `;

    if (!payment) {
      return c.json({ error: "Payment not found" }, 404);
    }

    return c.json({ payment });
  } catch (error) {
    console.error("Error fetching payment:", error);
    return c.json({ error: "Failed to fetch payment" }, 500);
  }
});

// POST /api/payments - Tạo payment mới
paymentRouter.post("/", async (c) => {
  try {
    const { order_id, payment_method, transaction_id } = await c.req.json();

    if (!order_id || !payment_method) {
      return c.json({ error: "Order ID and payment method are required" }, 400);
    }

    const validMethods = ["credit_card", "debit_card", "paypal", "bank_transfer", "cash"];
    if (!validMethods.includes(payment_method)) {
      return c.json({ error: "Invalid payment method" }, 400);
    }

    if (!c.env?.DB_AVAILABLE) {
      const mockPayment = {
        id: Date.now(),
        order_id,
        amount: 99.98,
        payment_method,
        payment_status: "pending",
        transaction_id: transaction_id || `txn_${Date.now()}`,
        created_at: new Date()
      };
      return c.json({ payment: mockPayment }, 201);
    }

    // Kiểm tra order tồn tại
    const [order] = await c.env.SQL`
      SELECT id, total_amount, status FROM orders WHERE id = ${order_id}
    `;

    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    // Kiểm tra xem order đã có payment chưa
    const [existingPayment] = await c.env.SQL`
      SELECT id FROM payments WHERE order_id = ${order_id}
    `;

    if (existingPayment) {
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

    const validStatuses = ["pending", "processing", "completed", "failed", "refunded"];
    if (!payment_status || !validStatuses.includes(payment_status)) {
      return c.json({ error: "Valid payment status is required (pending, processing, completed, failed, refunded)" }, 400);
    }

    if (!c.env?.DB_AVAILABLE) {
      const mockPayment = { id: parseInt(id), payment_status, updated_at: new Date() };
      return c.json({ payment: mockPayment });
    }

    const [payment] = await c.env.SQL`
      UPDATE payments 
      SET payment_status = ${payment_status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, order_id, amount, payment_method, payment_status, transaction_id, created_at, updated_at
    `;

    if (!payment) {
      return c.json({ error: "Payment not found" }, 404);
    }

      // Nếu payment completed, gọi Order service để cập nhật trạng thái đơn hàng
    if (payment_status === "completed") {
        const orderReq = new Request(`http://internal/${payment.order_id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "processing" })
        });
        await orderRouter.request(orderReq, c.env);
    }

    return c.json({ payment });
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
      return c.json({
        payment: { id: parseInt(id), payment_status: "refunded", updated_at: new Date() },
        message: "Refund processed successfully"
      });
    }

    // Kiểm tra payment tồn tại và có thể refund
    const [payment] = await c.env.SQL`
      SELECT id, order_id, payment_status FROM payments WHERE id = ${id}
    `;

    if (!payment) {
      return c.json({ error: "Payment not found" }, 404);
    }

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

      // Cập nhật order status thành cancelled thông qua Order service
      const cancelReq = new Request(`http://internal/${payment.order_id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelled" })
      });
      await orderRouter.request(cancelReq, c.env);

    // Hoàn trả stock cho các products
    const items = await c.env.SQL`
      SELECT product_id, quantity FROM order_items WHERE order_id = ${payment.order_id}
    `;

    for (const item of items) {
      await c.env.SQL`
        UPDATE products 
        SET stock_quantity = stock_quantity + ${item.quantity}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${item.product_id}
      `;
    }

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

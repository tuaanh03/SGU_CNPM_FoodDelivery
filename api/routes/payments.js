import { Hono } from "hono";
import { mockPayments, mockOrders } from "../lib/mockData.js";

const paymentRouter = new Hono();

// GET /api/payments - Lấy danh sách payments
paymentRouter.get("/", async (c) => {
    try {
        const { order_id, status } = c.req.query();

        if (!c.env?.DB_AVAILABLE) {
            let filteredPayments = [...mockPayments];

            if (order_id) {
                filteredPayments = filteredPayments.filter(p => p.order_id === parseInt(order_id));
            }

            if (status) {
                filteredPayments = filteredPayments.filter(p => p.payment_status === status);
            }

            return c.json({ payments: filteredPayments });
        }

        const sql = c.env.SQL;
        let query;
        if (order_id && status) {
            query = sql`SELECT * FROM payments WHERE order_id = ${parseInt(order_id)} AND payment_status = ${status}`;
        } else if (order_id) {
            query = sql`SELECT * FROM payments WHERE order_id = ${parseInt(order_id)}`;
        } else if (status) {
            query = sql`SELECT * FROM payments WHERE payment_status = ${status}`;
        } else {
            query = sql`SELECT * FROM payments`;
        }

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
            const payment = mockPayments.find(p => p.id === parseInt(id));
            if (!payment) {
                return c.json({ error: "Payment not found" }, 404);
            }
            return c.json({ payment });
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
            if (parseInt(order_id) === 999) {
                return c.json({ error: "Order not found" }, 404);
            }

            const payment = {
                id: mockPayments.length + 1,
                order_id: parseInt(order_id),
                amount: parseFloat(amount) || 99.98,
                payment_method,
                payment_status: "pending",
                transaction_id: transaction_id || `txn_${Date.now()}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            mockPayments.push(payment);

            return c.json({ payment }, 201);
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
            const payment = mockPayments.find(p => p.id === parseInt(id));
            if (!payment) {
                return c.json({ error: "Payment not found" }, 404);
            }
            payment.payment_status = payment_status;
            payment.updated_at = new Date().toISOString();
            return c.json({ payment });
        }

        const [payment] = await c.env.SQL`UPDATE payments SET payment_status = ${payment_status} WHERE id = ${id} RETURNING id, order_id, amount, payment_method, payment_status, transaction_id, created_at, updated_at`;
        if (!payment) {
            return c.json({ error: "Payment not found" }, 404);
        }
        await c.env.SQL`UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = ${payment.order_id}`;
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
            const payment = mockPayments.find(p => p.id === parseInt(id));
            if (!payment) {
                return c.json({ error: "Payment not found" }, 404);
            }

            if (payment.payment_status !== "completed") {
                return c.json({ error: "Can only refund completed payments" }, 400);
            }

            payment.payment_status = "refunded";
            payment.updated_at = new Date().toISOString();

            return c.json({
                payment,
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

        await c.env.SQL`UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = ${payment.order_id}`;
        await c.env.SQL`SELECT product_id, quantity FROM order_items WHERE order_id = ${payment.order_id}`;
        await c.env.SQL`-- update product stock`;

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
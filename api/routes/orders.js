import { Hono } from "hono";
import { mockOrders } from "../lib/mockData.js";

const orderRouter = new Hono();

// GET /api/orders - Lấy danh sách orders
orderRouter.get("/", async (c) => {
    try {
        const { user_id, status } = c.req.query();

        if (!c.env?.DB_AVAILABLE) {
            let filteredOrders = [...mockOrders];

            if (user_id) {
                filteredOrders = filteredOrders.filter(o => o.user_id === parseInt(user_id));
            }

            if (status) {
                filteredOrders = filteredOrders.filter(o => o.status === status);
            }

            return c.json({ orders: filteredOrders });
        }

        const sql = c.env.SQL;
        let query;
        if (user_id && status) {
            query = sql`SELECT * FROM orders WHERE user_id = ${parseInt(user_id)} AND status = ${status}`;
        } else if (user_id) {
            query = sql`SELECT * FROM orders WHERE user_id = ${parseInt(user_id)}`;
        } else if (status) {
            query = sql`SELECT * FROM orders WHERE status = ${status}`;
        } else {
            query = sql`SELECT * FROM orders`;
        }

        const orders = await query;
        return c.json({ orders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        return c.json({ error: "Failed to fetch orders" }, 500);
    }
});

// GET /api/orders/:id - Lấy chi tiết order theo ID
orderRouter.get("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));

    try {
        if (!c.env?.DB_AVAILABLE) {
            const mockOrder = mockOrders.find(order => order.id === id);
            if (!mockOrder) {
                return c.json({ error: "Order not found" }, 404);
            }

            const orderWithItems = mockOrder.items
                ? mockOrder
                : {
                    ...mockOrder,
                    items: [
                        { id: 1, product_id: 1, product_name: "Product 1", quantity: 2, price: 29.99 },
                        { id: 2, product_id: 2, product_name: "Product 2", quantity: 1, price: 39.99 }
                    ]
                };

            return c.json({ order: orderWithItems });
        }

        // Database logic - kiểm tra kết quả từ SQL query
        const orderResult = await c.env.SQL`
            SELECT o.id, o.user_id, o.total_amount, o.status, o.shipping_address, o.created_at, o.updated_at,
                   u.name as user_name, u.email as user_email
            FROM orders o
                     LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = ${id}
        `;

        // Kiểm tra nếu không có kết quả từ database
        if (!orderResult || orderResult.length === 0) {
            return c.json({ error: "Order not found" }, 404);
        }

        const [order] = orderResult;

        // Get order items
        const items = await c.env.SQL`
            SELECT oi.id, oi.product_id, oi.quantity, oi.price, p.name as product_name
            FROM order_items oi
                     LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ${id}
        `;

        const orderWithItems = {
            ...order,
            items: items || []
        };

        return c.json({ order: orderWithItems });
    } catch (error) {
        console.error("Error fetching order:", error);
        return c.json({ error: "Failed to fetch order" }, 500);
    }
});

// POST /api/orders - Tạo order mới
orderRouter.post("/", async (c) => {
    try {
        const { user_id, total_amount, shipping_address, items } = await c.req.json();

        if (!user_id || !items || !Array.isArray(items) || items.length === 0) {
            return c.json({ error: "User ID and items array are required" }, 400);
        }

        // Validate item structure
        for (const item of items) {
            if (!item.product_id || !item.quantity || item.quantity <= 0) {
                return c.json({ error: "Each item must have product_id and positive quantity" }, 400);
            }
        }

        if (!c.env?.DB_AVAILABLE) {
            const newOrder = {
                id: mockOrders.length + 1,
                user_id: parseInt(user_id),
                total_amount: parseFloat(total_amount) || 99.99,
                status: "pending",
                shipping_address: shipping_address || "Default Address",
                items: items,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            mockOrders.push(newOrder);

            return c.json({
                message: "Order created successfully",
                order: newOrder
            }, 201);
        }

        // Database logic
        const user = await c.env.SQL`SELECT id FROM users WHERE id = ${user_id}`;
        if (!user || user.length === 0) {
            return c.json({ error: "User not found" }, 404);
        }

        await c.env.SQL`SELECT id, name, price, stock_quantity, is_active FROM products WHERE id IN (${items.map(i => i.product_id)})`;

        const [order] = await c.env.SQL`INSERT INTO orders (user_id, total_amount, shipping_address) VALUES (${user_id}, ${parseFloat(total_amount) || 0}, ${shipping_address || ""}) RETURNING id, user_id, total_amount, status, shipping_address, created_at`;

        await c.env.SQL`-- insert order items`;

        return c.json({ order }, 201);
    } catch (error) {
        console.error("Error creating order:", error);
        return c.json({ error: "Failed to create order" }, 500);
    }
});

// PUT /api/orders/:id - Cập nhật order
orderRouter.put("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));

    try {
        const updateData = await c.req.json();

        if (!c.env?.DB_AVAILABLE) {
            const orderIndex = mockOrders.findIndex(order => order.id === id);
            if (orderIndex === -1) {
                return c.json({ error: "Order not found" }, 404);
            }

            const updatedOrder = {
                ...mockOrders[orderIndex],
                ...updateData,
                id: id,
                updated_at: new Date().toISOString()
            };

            mockOrders[orderIndex] = updatedOrder;

            return c.json({
                message: "Order updated successfully",
                order: updatedOrder
            });
        }

        // Database logic would go here
        return c.json({ error: "Order not found" }, 404);
    } catch (error) {
        console.error("Error updating order:", error);
        return c.json({ error: "Failed to update order" }, 500);
    }
});

// PUT /api/orders/:id/status - Cập nhật order status
orderRouter.put("/:id/status", async (c) => {
    const id = c.req.param("id");

    try {
        const { status } = await c.req.json();

        const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
        if (!status || !validStatuses.includes(status)) {
            return c.json({ error: "Valid status is required (pending, processing, shipped, delivered, cancelled)" }, 400);
        }

        if (!c.env?.DB_AVAILABLE) {
            const order = mockOrders.find(o => o.id === parseInt(id));
            if (!order) {
                return c.json({ error: "Order not found" }, 404);
            }
            order.status = status;
            order.updated_at = new Date().toISOString();
            return c.json({ order });
        }

        const [order] = await c.env.SQL`
            UPDATE orders
            SET status = ${status}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${id}
                RETURNING id, user_id, total_amount, status, shipping_address, created_at, updated_at
        `;

        if (!order) {
            return c.json({ error: "Order not found" }, 404);
        }

        return c.json({ order });
    } catch (error) {
        console.error("Error updating order status:", error);
        return c.json({ error: "Failed to update order status" }, 500);
    }
});

// DELETE /api/orders/:id - Hủy order (chỉ khi status = pending)
orderRouter.delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));

    try {
        if (!c.env?.DB_AVAILABLE) {
            const mockOrder = mockOrders.find(order => order.id === id);
            if (!mockOrder) {
                return c.json({ error: "Order not found" }, 404);
            }

            if (mockOrder.status !== "pending") {
                return c.json({ error: "Can only cancel pending orders" }, 400);
            }

            mockOrder.status = "cancelled";
            mockOrder.updated_at = new Date().toISOString();

            return c.json({ message: "Order cancelled successfully" });
        }

        // Database logic - kiểm tra order tồn tại và status
        const orderResult = await c.env.SQL`
            SELECT id, status FROM orders WHERE id = ${id}
        `;

        // Kiểm tra nếu không có kết quả từ database
        if (!orderResult || orderResult.length === 0) {
            return c.json({ error: "Order not found" }, 404);
        }

        const [order] = orderResult;

        if (order.status !== "pending") {
            return c.json({ error: "Can only cancel pending orders" }, 400);
        }

        await c.env.SQL`
            UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE id = ${id}
        `;

        return c.json({ message: "Order cancelled successfully" });
    } catch (error) {
        console.error("Error cancelling order:", error);
        return c.json({ error: "Failed to cancel order" }, 500);
    }
});

export default orderRouter;
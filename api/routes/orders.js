import { Hono } from "hono";

const orderRouter = new Hono();

// GET /api/orders - Lấy danh sách orders
orderRouter.get("/", async (c) => {
  try {
    const { user_id, status } = c.req.query();

    if (!c.env.DB_AVAILABLE) {
      return c.json({
        orders: [
          { id: 1, user_id: 1, total_amount: 99.98, status: "pending", shipping_address: "123 Main St", created_at: new Date() },
          { id: 2, user_id: 2, total_amount: 149.99, status: "completed", shipping_address: "456 Oak Ave", created_at: new Date() }
        ]
      });
    }

    let query = c.env.SQL`
      SELECT o.id, o.user_id, o.total_amount, o.status, o.shipping_address, o.created_at, o.updated_at,
             u.name as user_name, u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;

    if (user_id) {
      query = c.env.SQL`${query} AND o.user_id = ${user_id}`;
    }

    if (status) {
      query = c.env.SQL`${query} AND o.status = ${status}`;
    }

    query = c.env.SQL`${query} ORDER BY o.created_at DESC`;

    const orders = await query;
    return c.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return c.json({ error: "Failed to fetch orders" }, 500);
  }
});

// GET /api/orders/:id - Lấy chi tiết order theo ID (bao gồm items)
orderRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    if (!c.env.DB_AVAILABLE) {
      const mockOrder = {
        id: parseInt(id),
        user_id: 1,
        total_amount: 99.98,
        status: "pending",
        shipping_address: "123 Main St",
        created_at: new Date(),
        items: [
          { id: 1, product_id: 1, product_name: "Product 1", quantity: 2, price: 29.99 },
          { id: 2, product_id: 2, product_name: "Product 2", quantity: 1, price: 39.99 }
        ]
      };
      return c.json({ order: mockOrder });
    }

    const [order] = await c.env.SQL`
      SELECT o.id, o.user_id, o.total_amount, o.status, o.shipping_address, o.created_at, o.updated_at,
             u.name as user_name, u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ${id}
    `;

    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    // Lấy order items
    const items = await c.env.SQL`
      SELECT oi.id, oi.product_id, oi.quantity, oi.price,
             p.name as product_name, p.description as product_description
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ${id}
      ORDER BY oi.created_at
    `;

    order.items = items;
    return c.json({ order });
  } catch (error) {
    console.error("Error fetching order:", error);
    return c.json({ error: "Failed to fetch order" }, 500);
  }
});

// POST /api/orders - Tạo order mới
orderRouter.post("/", async (c) => {
  try {
    const { user_id, items, shipping_address } = await c.req.json();

    if (!user_id || !items || !Array.isArray(items) || items.length === 0) {
      return c.json({ error: "User ID and items array are required" }, 400);
    }

    // Validate items structure
    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        return c.json({ error: "Each item must have product_id and positive quantity" }, 400);
      }
    }

    if (!c.env.DB_AVAILABLE) {
      const total_amount = items.reduce((sum, item) => sum + (item.price || 29.99) * item.quantity, 0);
      const mockOrder = {
        id: Date.now(),
        user_id,
        total_amount,
        status: "pending",
        shipping_address,
        created_at: new Date(),
        items
      };
      return c.json({ order: mockOrder }, 201);
    }

    // Kiểm tra user tồn tại
    const [user] = await c.env.SQL`SELECT id FROM users WHERE id = ${user_id}`;
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Lấy thông tin products và kiểm tra stock
    const productIds = items.map(item => item.product_id);
    const products = await c.env.SQL`
      SELECT id, name, price, stock_quantity, is_active
      FROM products 
      WHERE id = ANY(${productIds}) AND is_active = true
    `;

    if (products.length !== productIds.length) {
      return c.json({ error: "Some products not found or inactive" }, 404);
    }

    // Kiểm tra stock availability
    for (const item of items) {
      const product = products.find(p => p.id === item.product_id);
      if (product.stock_quantity < item.quantity) {
        return c.json({ error: `Insufficient stock for product ${product.name}` }, 400);
      }
    }

    // Tính tổng tiền
    const total_amount = items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id);
      return sum + product.price * item.quantity;
    }, 0);

    // Tạo order
    const [order] = await c.env.SQL`
      INSERT INTO orders (user_id, total_amount, shipping_address)
      VALUES (${user_id}, ${total_amount}, ${shipping_address || null})
      RETURNING id, user_id, total_amount, status, shipping_address, created_at, updated_at
    `;

    // Tạo order items và cập nhật stock
    for (const item of items) {
      const product = products.find(p => p.id === item.product_id);

      await c.env.SQL`
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (${order.id}, ${item.product_id}, ${item.quantity}, ${product.price})
      `;

      // Cập nhật stock
      await c.env.SQL`
        UPDATE products 
        SET stock_quantity = stock_quantity - ${item.quantity}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${item.product_id}
      `;
    }

    // Lấy thông tin đầy đủ của order vừa tạo
    const orderItems = await c.env.SQL`
      SELECT oi.id, oi.product_id, oi.quantity, oi.price,
             p.name as product_name
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ${order.id}
    `;

    order.items = orderItems;
    return c.json({ order }, 201);
  } catch (error) {
    console.error("Error creating order:", error);
    return c.json({ error: "Failed to create order" }, 500);
  }
});

// PUT /api/orders/:id/status - Cập nhật status order
orderRouter.put("/:id/status", async (c) => {
  const id = c.req.param("id");

  try {
    const { status } = await c.req.json();

    const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return c.json({ error: "Valid status is required (pending, processing, shipped, delivered, cancelled)" }, 400);
    }

    if (!c.env.DB_AVAILABLE) {
      const mockOrder = { id: parseInt(id), status, updated_at: new Date() };
      return c.json({ order: mockOrder });
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

// DELETE /api/orders/:id - Xóa order (chỉ cho phép khi status = pending)
orderRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    if (!c.env.DB_AVAILABLE) {
      return c.json({ message: "Order cancelled successfully" });
    }

    // Kiểm tra status trước khi xóa
    const [order] = await c.env.SQL`
      SELECT id, status FROM orders WHERE id = ${id}
    `;

    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    if (order.status !== "pending") {
      return c.json({ error: "Can only cancel pending orders" }, 400);
    }

    // Hoàn trả stock cho các products
    const items = await c.env.SQL`
      SELECT product_id, quantity FROM order_items WHERE order_id = ${id}
    `;

    for (const item of items) {
      await c.env.SQL`
        UPDATE products 
        SET stock_quantity = stock_quantity + ${item.quantity}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${item.product_id}
      `;
    }

    // Xóa order (cascade sẽ tự động xóa order_items)
    await c.env.SQL`DELETE FROM orders WHERE id = ${id}`;

    return c.json({ message: "Order cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return c.json({ error: "Failed to cancel order" }, 500);
  }
});

export default orderRouter;

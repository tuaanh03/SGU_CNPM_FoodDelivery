import { Hono } from "hono";
import { hashPassword, verifyPassword } from "../lib/auth.js";

const userRouter = new Hono();

// GET /api/users - Lấy danh sách users
userRouter.get("/", async (c) => {
  try {
    if (!c.env?.DB_AVAILABLE) {
      return c.json({
        users: [
          { id: 1, email: "user1@example.com", name: "John Doe", phone: "0123456789", address: "123 Main St" },
          { id: 2, email: "user2@example.com", name: "Jane Smith", phone: "0987654321", address: "456 Oak Ave" }
        ]
      });
    }

    const users = await c.env.SQL`
      SELECT id, email, name, phone, address, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `;

    return c.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

// GET /api/users/:id - Lấy thông tin user theo ID
userRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    if (!c.env?.DB_AVAILABLE) {
      const mockUser = { id: parseInt(id), email: "user@example.com", name: "Mock User", phone: "0123456789", address: "123 Mock St" };
      return c.json({ user: mockUser });
    }

    const [user] = await c.env.SQL`
      SELECT id, email, name, phone, address, created_at, updated_at 
      FROM users 
      WHERE id = ${id}
    `;

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return c.json({ error: "Failed to fetch user" }, 500);
  }
});

// POST /api/users - Tạo user mới
userRouter.post("/", async (c) => {
  try {
    const { email, name, password, phone, address } = await c.req.json();

    if (!email || !name || !password) {
      return c.json({ error: "Email, name, and password are required" }, 400);
    }

    if (!c.env?.DB_AVAILABLE) {
      const mockUser = { id: Date.now(), email, name, phone, address, created_at: new Date() };
      return c.json({ user: mockUser }, 201);
    }

    const password_hash = await hashPassword(password);

    const [user] = await c.env.SQL`
      INSERT INTO users (email, name, password_hash, phone, address)
      VALUES (${email}, ${name}, ${password_hash}, ${phone || null}, ${address || null})
      RETURNING id, email, name, phone, address, created_at, updated_at
    `;

    return c.json({ user }, 201);
  } catch (error) {
    console.error("Error creating user:", error);
    if (error.message.includes('duplicate key')) {
      return c.json({ error: "Email already exists" }, 409);
    }
    return c.json({ error: "Failed to create user" }, 500);
  }
});

// PUT /api/users/:id - Cập nhật thông tin user
userRouter.put("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const { name, phone, address } = await c.req.json();

    if (!name) {
      return c.json({ error: "Name is required" }, 400);
    }

    if (!c.env?.DB_AVAILABLE) {
      const mockUser = { id: parseInt(id), email: "user@example.com", name, phone, address, updated_at: new Date() };
      return c.json({ user: mockUser });
    }

    const [user] = await c.env.SQL`
      UPDATE users 
      SET name = ${name}, phone = ${phone || null}, address = ${address || null}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, email, name, phone, address, created_at, updated_at
    `;

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({ user });
  } catch (error) {
    console.error("Error updating user:", error);
    return c.json({ error: "Failed to update user" }, 500);
  }
});

// DELETE /api/users/:id - Xóa user
userRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    if (!c.env?.DB_AVAILABLE) {
      return c.json({ message: "User deleted successfully" });
    }

    const result = await c.env.SQL`
      DELETE FROM users WHERE id = ${id}
    `;

    if (result.count === 0) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({ error: "Failed to delete user" }, 500);
  }
});

export default userRouter;

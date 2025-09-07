import { Hono } from "hono";

const productRouter = new Hono();

// GET /api/products - Lấy danh sách products
productRouter.get("/", async (c) => {
  try {
    const { category, active } = c.req.query();

    if (!c.env?.DB_AVAILABLE) {
      return c.json({
        products: [
          { id: 1, name: "Product 1", description: "Description 1", price: 29.99, category: "electronics", stock_quantity: 100, is_active: true },
          { id: 2, name: "Product 2", description: "Description 2", price: 19.99, category: "books", stock_quantity: 50, is_active: true }
        ]
      });
    }

    let query = c.env.SQL`
      SELECT id, name, description, price, category, stock_quantity, image_url, is_active, created_at, updated_at 
      FROM products 
      WHERE 1=1
    `;

    if (category) {
      query = c.env.SQL`${query} AND category = ${category}`;
    }

    if (active !== undefined) {
      query = c.env.SQL`${query} AND is_active = ${active === 'true'}`;
    }

    query = c.env.SQL`${query} ORDER BY created_at DESC`;

    const products = await query;
    return c.json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return c.json({ error: "Failed to fetch products" }, 500);
  }
});

// GET /api/products/:id - Lấy thông tin product theo ID
productRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    if (!c.env?.DB_AVAILABLE) {
      const mockProduct = { id: parseInt(id), name: "Mock Product", description: "Mock Description", price: 29.99, category: "electronics", stock_quantity: 100, is_active: true };
      return c.json({ product: mockProduct });
    }

    const [product] = await c.env.SQL`
      SELECT id, name, description, price, category, stock_quantity, image_url, is_active, created_at, updated_at 
      FROM products 
      WHERE id = ${id}
    `;

    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }

    return c.json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return c.json({ error: "Failed to fetch product" }, 500);
  }
});

// POST /api/products - Tạo product mới
productRouter.post("/", async (c) => {
  try {
    const { name, description, price, category, stock_quantity, image_url } = await c.req.json();

    if (!name || !price) {
      return c.json({ error: "Name and price are required" }, 400);
    }

    if (price <= 0) {
      return c.json({ error: "Price must be greater than 0" }, 400);
    }

    if (!c.env?.DB_AVAILABLE) {
      const mockProduct = {
        id: Date.now(),
        name,
        description,
        price: parseFloat(price),
        category,
        stock_quantity: stock_quantity || 0,
        image_url,
        is_active: true,
        created_at: new Date()
      };
      return c.json({ product: mockProduct }, 201);
    }

    const [product] = await c.env.SQL`
      INSERT INTO products (name, description, price, category, stock_quantity, image_url)
      VALUES (${name}, ${description || null}, ${price}, ${category || null}, ${stock_quantity || 0}, ${image_url || null})
      RETURNING id, name, description, price, category, stock_quantity, image_url, is_active, created_at, updated_at
    `;

    return c.json({ product }, 201);
  } catch (error) {
    console.error("Error creating product:", error);
    return c.json({ error: "Failed to create product" }, 500);
  }
});

// PUT /api/products/:id - Cập nhật product
productRouter.put("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const { name, description, price, category, stock_quantity, image_url, is_active } = await c.req.json();

    if (!name || !price) {
      return c.json({ error: "Name and price are required" }, 400);
    }

    if (price <= 0) {
      return c.json({ error: "Price must be greater than 0" }, 400);
    }

    if (!c.env?.DB_AVAILABLE) {
      const mockProduct = {
        id: parseInt(id),
        name,
        description,
        price: parseFloat(price),
        category,
        stock_quantity: stock_quantity || 0,
        image_url,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date()
      };
      return c.json({ product: mockProduct });
    }

    const [product] = await c.env.SQL`
      UPDATE products 
      SET name = ${name}, description = ${description || null}, price = ${price}, 
          category = ${category || null}, stock_quantity = ${stock_quantity || 0}, 
          image_url = ${image_url || null}, is_active = ${is_active !== undefined ? is_active : true},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, name, description, price, category, stock_quantity, image_url, is_active, created_at, updated_at
    `;

    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }

    return c.json({ product });
  } catch (error) {
    console.error("Error updating product:", error);
    return c.json({ error: "Failed to update product" }, 500);
  }
});

// DELETE /api/products/:id - Xóa product
productRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    if (!c.env?.DB_AVAILABLE) {
      return c.json({ message: "Product deleted successfully" });
    }

    const result = await c.env.SQL`
      DELETE FROM products WHERE id = ${id}
    `;

    if (result.count === 0) {
      return c.json({ error: "Product not found" }, 404);
    }

    return c.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return c.json({ error: "Failed to delete product" }, 500);
  }
});

// PUT /api/products/:id/stock - Cập nhật stock quantity
productRouter.put("/:id/stock", async (c) => {
  const id = c.req.param("id");

  try {
    const { quantity } = await c.req.json();

    if (quantity === undefined || quantity < 0) {
      return c.json({ error: "Valid quantity is required" }, 400);
    }

    if (!c.env?.DB_AVAILABLE) {
      const mockProduct = { id: parseInt(id), stock_quantity: quantity, updated_at: new Date() };
      return c.json({ product: mockProduct });
    }

    const [product] = await c.env.SQL`
      UPDATE products 
      SET stock_quantity = ${quantity}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, name, stock_quantity, updated_at
    `;

    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }

    return c.json({ product });
  } catch (error) {
    console.error("Error updating product stock:", error);
    return c.json({ error: "Failed to update product stock" }, 500);
  }
});

export default productRouter;

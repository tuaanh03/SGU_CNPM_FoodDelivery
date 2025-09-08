import { Hono } from "hono";
import { mockProducts } from "../lib/mockData.js";

const productRouter = new Hono();

// GET /api/products - Lấy danh sách products
productRouter.get("/", async (c) => {
  try {
    const { category, active } = c.req.query();

    if (!c.env?.DB_AVAILABLE) {
      let filteredProducts = [...mockProducts];

      if (category) {
        filteredProducts = filteredProducts.filter(p => p.category === category);
      }

      if (active !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.is_active === (active === 'true'));
      }

      return c.json({ products: filteredProducts });
    }

    const sql = c.env.SQL;
    const isActive = active === 'true';
    let query;
    if (category && active !== undefined) {
      query = sql`SELECT * FROM products WHERE category = ${category} AND is_active = ${isActive}`;
    } else if (category) {
      query = sql`SELECT * FROM products WHERE category = ${category}`;
    } else if (active !== undefined) {
      query = sql`SELECT * FROM products WHERE is_active = ${isActive}`;
    } else {
      query = sql`SELECT * FROM products`;
    }

    const products = await query;
    return c.json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return c.json({ error: "Failed to fetch products" }, 500);
  }
});

// GET /api/products/:id - Lấy thông tin product theo ID
productRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  try {
    if (!c.env?.DB_AVAILABLE) {
      const mockProduct = mockProducts.find(product => product.id === id);
      if (!mockProduct) {
        return c.json({ error: "Product not found" }, 404);
      }
      return c.json({ product: mockProduct });
    }

    const [product] = await c.env.SQL`SELECT * FROM products WHERE id = ${id}`;
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
    const { name, description, price, category, stock_quantity, image_url, is_active } = await c.req.json();

    if (!name || !price) {
      return c.json({ error: "Name and price are required" }, 400);
    }

    if (parseFloat(price) <= 0) {
      return c.json({ error: "Price must be greater than 0" }, 400);
    }

    if (!c.env?.DB_AVAILABLE) {
      const newProduct = {
        id: mockProducts.length + 1,
        name,
        description: description || null,
        price: parseFloat(price),
        category: category || "general",
        stock_quantity: stock_quantity || 0,
        image_url: image_url || null,
        is_active: is_active !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockProducts.push(newProduct);

      return c.json({
        message: "Product created successfully",
        product: newProduct
      }, 201);
    }

    return c.json({ error: "Failed to create product" }, 500);
  } catch (error) {
    console.error("Error creating product:", error);
    return c.json({ error: "Failed to create product" }, 500);
  }
});

// PUT /api/products/:id - Cập nhật thông tin product
productRouter.put("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  try {
    const updateData = await c.req.json();

    if (!c.env?.DB_AVAILABLE) {
      const productIndex = mockProducts.findIndex(product => product.id === id);
      if (productIndex === -1) {
        return c.json({ error: "Product not found" }, 404);
      }

      const updatedProduct = {
        ...mockProducts[productIndex],
        ...updateData,
        id: id,
        updated_at: new Date().toISOString()
      };

      mockProducts[productIndex] = updatedProduct;

      return c.json({
        message: "Product updated successfully",
        product: updatedProduct
      });
    }

    const [product] = await c.env.SQL`SELECT * FROM products WHERE id = ${id}`;
    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }
    return c.json({
      message: "Product updated successfully",
      product
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return c.json({ error: "Failed to update product" }, 500);
  }
});

// PUT /api/products/:id/stock - Cập nhật stock quantity
productRouter.put("/:id/stock", async (c) => {
  const id = parseInt(c.req.param("id"));

  try {
    const { quantity } = await c.req.json();

    if (quantity === undefined || quantity < 0) {
      return c.json({ error: "Valid quantity is required" }, 400);
    }

    if (!c.env?.DB_AVAILABLE) {
      const productIndex = mockProducts.findIndex(product => product.id === id);
      if (productIndex === -1) {
        return c.json({ error: "Product not found" }, 404);
      }

      const updatedProduct = {
        ...mockProducts[productIndex],
        stock_quantity: parseInt(quantity),
        updated_at: new Date().toISOString()
      };

      mockProducts[productIndex] = updatedProduct;

      return c.json({ product: updatedProduct });
    }

    const [product] = await c.env.SQL`SELECT * FROM products WHERE id = ${id}`;
    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }
    return c.json({ product });
  } catch (error) {
    console.error("Error updating product stock:", error);
    return c.json({ error: "Failed to update product stock" }, 500);
  }
});

// DELETE /api/products/:id - Xóa product
productRouter.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  try {
    if (!c.env?.DB_AVAILABLE) {
      const productIndex = mockProducts.findIndex(product => product.id === id);
      if (productIndex === -1) {
        return c.json({ error: "Product not found" }, 404);
      }

      mockProducts.splice(productIndex, 1);

      return c.json({ message: "Product deleted successfully" });
    }

    const result = await c.env.SQL`DELETE FROM products WHERE id = ${id}`;
    if (!result || (Array.isArray(result) ? result.length === 0 : result.count === 0)) {
      return c.json({ error: "Product not found" }, 404);
    }
    return c.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return c.json({ error: "Failed to delete product" }, 500);
  }
});

export default productRouter;

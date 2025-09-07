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

    // Database query would go here
    const products = [];
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

    // Database query would go here
    return c.json({ error: "Product not found" }, 404);
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

      return c.json({
        message: "Product created successfully",
        product: newProduct
      }, 201);
    }

    // Database insert would go here
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

      return c.json({
        message: "Product updated successfully",
        product: updatedProduct
      });
    }

    // Database update would go here
    return c.json({ error: "Product not found" }, 404);
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

    if (quantity === undefined || quantity < 0 || !Number.isInteger(quantity)) {
      return c.json({ error: "Valid quantity is required" }, 400);
    }

    if (!c.env?.DB_AVAILABLE) {
      const productIndex = mockProducts.findIndex(product => product.id === id);
      if (productIndex === -1) {
        return c.json({ error: "Product not found" }, 404);
      }

      const updatedProduct = {
        ...mockProducts[productIndex],
        stock_quantity: quantity,
        updated_at: new Date().toISOString()
      };

      return c.json({
        message: "Stock quantity updated successfully",
        product: updatedProduct
      });
    }

    // Database update would go here
    return c.json({ error: "Product not found" }, 404);
  } catch (error) {
    console.error("Error updating stock:", error);
    return c.json({ error: "Failed to update stock" }, 500);
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

      return c.json({ message: "Product deleted successfully" });
    }

    // Database delete would go here
    return c.json({ error: "Product not found" }, 404);
  } catch (error) {
    console.error("Error deleting product:", error);
    return c.json({ error: "Failed to delete product" }, 500);
  }
});

export default productRouter;

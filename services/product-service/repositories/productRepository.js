import { v4 as uuidv4 } from 'uuid';

export class ProductRepository {
  constructor(database) {
    this.db = database.getConnection();
  }

  async create(productData) {
    const stmt = this.db.prepare(`
      INSERT INTO products (title, author, description, price, stock_quantity, image_url, category)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      productData.title,
      productData.author,
      productData.description,
      productData.price,
      productData.stock_quantity,
      productData.image_url,
      productData.category
    );

    return this.findById(result.lastInsertRowid);
  }

  async findById(id) {
    const stmt = this.db.prepare('SELECT * FROM products WHERE id = ?');
    return stmt.get(id);
  }

  async findAll() {
    const stmt = this.db.prepare('SELECT * FROM products ORDER BY created_at DESC');
    return stmt.all();
  }

  async update(id, productData) {
    const stmt = this.db.prepare(`
      UPDATE products 
      SET title = ?, author = ?, description = ?, price = ?, stock_quantity = ?, 
          image_url = ?, category = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      productData.title,
      productData.author,
      productData.description,
      productData.price,
      productData.stock_quantity,
      productData.image_url,
      productData.category,
      id
    );

    return this.findById(id);
  }

  async delete(id) {
    const stmt = this.db.prepare('DELETE FROM products WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async reserveStock(productId, quantity) {
    const reservationId = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    const transaction = this.db.transaction(() => {
      // Kiểm tra stock có đủ không
      const product = this.db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      if (!product) {
        throw new Error('Product không tồn tại');
      }

      const availableStock = product.stock_quantity - product.reserved_quantity;
      if (availableStock < quantity) {
        throw new Error('Không đủ stock');
      }

      // Cập nhật reserved_quantity
      this.db.prepare(`
        UPDATE products 
        SET reserved_quantity = reserved_quantity + ?
        WHERE id = ?
      `).run(quantity, productId);

      // Tạo reservation record
      this.db.prepare(`
        INSERT INTO stock_reservations (product_id, quantity, reservation_id, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(productId, quantity, reservationId, expiresAt.toISOString());
    });

    transaction();
    return { reservationId, expiresAt };
  }

  async commitStock(reservationId) {
    const transaction = this.db.transaction(() => {
      // Tìm reservation
      const reservation = this.db.prepare(`
        SELECT * FROM stock_reservations WHERE reservation_id = ?
      `).get(reservationId);

      if (!reservation) {
        throw new Error('Reservation không tồn tại');
      }

      // Kiểm tra expiration
      if (new Date(reservation.expires_at) < new Date()) {
        throw new Error('Reservation đã hết hạn');
      }

      // Giảm stock_quantity và reserved_quantity
      this.db.prepare(`
        UPDATE products 
        SET stock_quantity = stock_quantity - ?, 
            reserved_quantity = reserved_quantity - ?
        WHERE id = ?
      `).run(reservation.quantity, reservation.quantity, reservation.product_id);

      // Xóa reservation
      this.db.prepare(`
        DELETE FROM stock_reservations WHERE reservation_id = ?
      `).run(reservationId);
    });

    transaction();
    return true;
  }

  async releaseStock(reservationId) {
    const transaction = this.db.transaction(() => {
      // Tìm reservation
      const reservation = this.db.prepare(`
        SELECT * FROM stock_reservations WHERE reservation_id = ?
      `).get(reservationId);

      if (!reservation) {
        throw new Error('Reservation không tồn tại');
      }

      // Giảm reserved_quantity
      this.db.prepare(`
        UPDATE products 
        SET reserved_quantity = reserved_quantity - ?
        WHERE id = ?
      `).run(reservation.quantity, reservation.product_id);

      // Xóa reservation
      this.db.prepare(`
        DELETE FROM stock_reservations WHERE reservation_id = ?
      `).run(reservationId);
    });

    transaction();
    return true;
  }

  async cleanupExpiredReservations() {
    const now = new Date().toISOString();

    const transaction = this.db.transaction(() => {
      // Tìm expired reservations
      const expiredReservations = this.db.prepare(`
        SELECT * FROM stock_reservations WHERE expires_at < ?
      `).all(now);

      // Release stock cho các expired reservations
      for (const reservation of expiredReservations) {
        this.db.prepare(`
          UPDATE products 
          SET reserved_quantity = reserved_quantity - ?
          WHERE id = ?
        `).run(reservation.quantity, reservation.product_id);
      }

      // Xóa expired reservations
      this.db.prepare(`
        DELETE FROM stock_reservations WHERE expires_at < ?
      `).run(now);
    });

    transaction();
    return true;
  }

  async getAvailableStock(productId) {
    const stmt = this.db.prepare(`
      SELECT stock_quantity, reserved_quantity 
      FROM products WHERE id = ?
    `);
    const result = stmt.get(productId);

    if (!result) {
      return null;
    }

    return {
      total: result.stock_quantity,
      reserved: result.reserved_quantity,
      available: result.stock_quantity - result.reserved_quantity
    };
  }
}

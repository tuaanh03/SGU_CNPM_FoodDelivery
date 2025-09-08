import Database from 'better-sqlite3';
import path from 'path';

export class Database {
  constructor() {
    const dbPath = path.join(process.cwd(), 'services/order-service/database/orders.db');
    this.db = new Database(dbPath);
    this.init();
  }

  init() {
    // Tạo bảng orders
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled')),
        total_amount DECIMAL(10,2) NOT NULL,
        currency TEXT DEFAULT 'VND',
        payment_id TEXT,
        shipping_address TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tạo bảng order_items
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        reservation_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (order_id)
      )
    `);

    // Tạo bảng order_saga_state để theo dõi trạng thái saga
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS order_saga_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT UNIQUE NOT NULL,
        current_step TEXT NOT NULL,
        completed_steps TEXT,
        failed_step TEXT,
        compensation_steps TEXT,
        saga_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (order_id)
      )
    `);

    // Tạo index
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
      CREATE INDEX IF NOT EXISTS idx_saga_order ON order_saga_state(order_id);
    `);

    console.log('Order database initialized');
  }

  getConnection() {
    return this.db;
  }

  close() {
    this.db.close();
  }
}

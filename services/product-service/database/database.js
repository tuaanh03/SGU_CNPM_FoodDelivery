import Database from 'better-sqlite3';
import path from 'path';

export class Database {
  constructor() {
    const dbPath = path.join(process.cwd(), 'services/product-service/database/products.db');
    this.db = new Database(dbPath);
    this.init();
  }

  init() {
    // Tạo bảng products
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        reserved_quantity INTEGER NOT NULL DEFAULT 0,
        image_url TEXT,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tạo bảng stock_reservations để theo dõi các đặt chỗ tạm thời
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stock_reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        reservation_id TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id)
      )
    `);

    // Tạo index
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_reservations_product ON stock_reservations(product_id);
      CREATE INDEX IF NOT EXISTS idx_reservations_expires ON stock_reservations(expires_at);
    `);

    // Thêm dữ liệu mẫu nếu chưa có
    this.seedData();

    console.log('Product database initialized');
  }

  seedData() {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM products');
    const result = stmt.get();

    if (result.count === 0) {
      const insertStmt = this.db.prepare(`
        INSERT INTO products (title, author, description, price, stock_quantity, image_url, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const sampleProducts = [
        ['The Brothers Karamazov', 'Fyodor Dostoevsky', 'A philosophical novel about faith, doubt, and morality', 29.99, 50, '/images/books/brothers-karamazov.jpg', 'classic'],
        ['Anna Karenina', 'Leo Tolstoy', 'A tragic love story set in 19th century Russia', 24.99, 30, '/images/books/anna-karenina.jpg', 'classic'],
        ['East of Eden', 'John Steinbeck', 'An epic novel about good and evil', 22.99, 40, '/images/books/east-of-eden.jpg', 'modern'],
        ['The Fifth Season', 'N.K. Jemisin', 'A science fantasy novel', 19.99, 25, '/images/books/fifth-season.jpg', 'fantasy'],
        ['My Brilliant Friend', 'Elena Ferrante', 'The first book in the Neapolitan Novels', 21.99, 35, '/images/books/my-brilliant-friend.jpg', 'contemporary']
      ];

      sampleProducts.forEach(product => {
        insertStmt.run(...product);
      });

      console.log('Sample products added');
    }
  }

  getConnection() {
    return this.db;
  }

  close() {
    this.db.close();
  }
}

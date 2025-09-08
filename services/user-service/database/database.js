import Database from 'better-sqlite3';
import path from 'path';

export class Database {
  constructor() {
    const dbPath = path.join(process.cwd(), 'services/user-service/database/users.db');
    this.db = new Database(dbPath);
    this.init();
  }

  init() {
    // Tạo bảng users
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tạo index cho email
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    console.log('User database initialized');
  }

  getConnection() {
    return this.db;
  }

  close() {
    this.db.close();
  }
}

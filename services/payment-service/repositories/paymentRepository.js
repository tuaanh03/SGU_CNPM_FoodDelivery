import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
export class PaymentRepository {
  constructor(database) {
    this.db = database.getConnection();
  }

  async create(paymentData) {
    const paymentId = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO payments (payment_id, order_id, user_id, amount, currency, status, payment_method, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      paymentId,
      paymentData.order_id,
      paymentData.user_id,
      paymentData.amount,
      paymentData.currency || 'VND',
      'pending',
      paymentData.payment_method,
      JSON.stringify(paymentData.metadata || {})
    );

    return this.findByPaymentId(paymentId);
  }

  async findByPaymentId(paymentId) {
    const stmt = this.db.prepare('SELECT * FROM payments WHERE payment_id = ?');
    const payment = stmt.get(paymentId);

    if (payment && payment.metadata) {
      payment.metadata = JSON.parse(payment.metadata);
    }

    return payment;
  }

  async findById(id) {
    const stmt = this.db.prepare('SELECT * FROM payments WHERE id = ?');
    const payment = stmt.get(id);

    if (payment && payment.metadata) {
      payment.metadata = JSON.parse(payment.metadata);
    }

    return payment;
  }

  async findAll() {
    const stmt = this.db.prepare('SELECT * FROM payments ORDER BY created_at DESC');
    const payments = stmt.all();

    return payments.map(payment => {
      if (payment.metadata) {
        payment.metadata = JSON.parse(payment.metadata);
      }
      return payment;
    });
  }

  async updateStatus(paymentId, status, additionalData = {}) {
    const updateFields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [status];

    if (additionalData.authorization_id) {
      updateFields.push('authorization_id = ?');
      values.push(additionalData.authorization_id);
    }

    if (additionalData.capture_id) {
      updateFields.push('capture_id = ?');
      values.push(additionalData.capture_id);
    }

    if (additionalData.failure_reason) {
      updateFields.push('failure_reason = ?');
      values.push(additionalData.failure_reason);
    }

    values.push(paymentId);

    const stmt = this.db.prepare(`
      UPDATE payments 
      SET ${updateFields.join(', ')}
      WHERE payment_id = ?
    `);

    stmt.run(...values);
    return this.findByPaymentId(paymentId);
  }

  async addTransaction(paymentId, transactionType, amount, status, responseData = {}) {
    const stmt = this.db.prepare(`
      INSERT INTO payment_transactions (payment_id, transaction_type, amount, status, response_data)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      paymentId,
      transactionType,
      amount,
      status,
      JSON.stringify(responseData)
    );
  }

  async getTransactions(paymentId) {
    const stmt = this.db.prepare(`
      SELECT * FROM payment_transactions 
      WHERE payment_id = ? 
      ORDER BY created_at ASC
    `);

    const transactions = stmt.all(paymentId);

    return transactions.map(transaction => {
      if (transaction.response_data) {
        transaction.response_data = JSON.parse(transaction.response_data);
      }
      return transaction;
    });
  }

  async findByOrderId(orderId) {
    const stmt = this.db.prepare('SELECT * FROM payments WHERE order_id = ?');
    const payments = stmt.all(orderId);

    return payments.map(payment => {
      if (payment.metadata) {
        payment.metadata = JSON.parse(payment.metadata);
      }
      return payment;
    });
  }
}
import path from 'path';

export class Database {
  constructor() {
    const dbPath = path.join(process.cwd(), 'services/payment-service/database/payments.db');
    this.db = new Database(dbPath);
    this.init();
  }

  init() {
    // Tạo bảng payments
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id TEXT UNIQUE NOT NULL,
        order_id TEXT,
        user_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        currency TEXT DEFAULT 'VND',
        status TEXT NOT NULL CHECK (status IN ('pending', 'authorized', 'captured', 'failed', 'cancelled')),
        payment_method TEXT,
        authorization_id TEXT,
        capture_id TEXT,
        failure_reason TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tạo bảng payment_transactions để track các thao tác
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id TEXT NOT NULL,
        transaction_type TEXT NOT NULL CHECK (transaction_type IN ('authorize', 'capture', 'cancel', 'refund')),
        amount DECIMAL(10,2),
        status TEXT NOT NULL,
        response_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments (payment_id)
      )
    `);

    // Tạo index
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
      CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
      CREATE INDEX IF NOT EXISTS idx_transactions_payment ON payment_transactions(payment_id);
    `);

    console.log('Payment database initialized');
  }

  getConnection() {
    return this.db;
  }

  close() {
    this.db.close();
  }
}

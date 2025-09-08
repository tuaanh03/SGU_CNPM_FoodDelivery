export class UserRepository {
  constructor(database) {
    this.db = database.getConnection();
  }

  async create(userData) {
    const stmt = this.db.prepare(`
      INSERT INTO users (email, name, phone, address, password_hash)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userData.email,
      userData.name,
      userData.phone,
      userData.address,
      userData.password_hash
    );

    return this.findById(result.lastInsertRowid);
  }

  async findById(id) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  async findByEmail(email) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  async findAll() {
    const stmt = this.db.prepare('SELECT id, email, name, phone, address, created_at, updated_at FROM users ORDER BY created_at DESC');
    return stmt.all();
  }

  async update(id, userData) {
    const stmt = this.db.prepare(`
      UPDATE users 
      SET name = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(userData.name, userData.phone, userData.address, id);
    return this.findById(id);
  }

  async delete(id) {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async exists(id) {
    const stmt = this.db.prepare('SELECT 1 FROM users WHERE id = ?');
    return !!stmt.get(id);
  }
}

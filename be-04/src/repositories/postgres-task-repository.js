const TaskRepositoryInterface = require('./task-repository.interface');
const { getPool } = require('../db/postgres');

class PostgresTaskRepository extends TaskRepositoryInterface {
  constructor(pool) {
    super();
    this.pool = pool || getPool();
  }

  formatRow(row) {
    if (!row) return null;
    return {
      id: parseInt(row.id, 10),
      title: row.title,
      done: Boolean(row.done),
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    };
  }

  async findAll({ done, search, sort } = {}) {
    let query = 'SELECT id, title, done, created_at, updated_at FROM tasks';
    const conditions = [];
    const values = [];

    if (done !== undefined && done !== null) {
      const isDone = done === 'true' || done === true || done === '1' || done === 1;
      values.push(isDone);
      conditions.push(`done = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`title ILIKE $${values.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    if (sort === 'title') {
      query += ' ORDER BY title ASC';
    } else if (sort === 'created_at') {
      query += ' ORDER BY created_at ASC';
    } else {
      query += ' ORDER BY id ASC';
    }

    const { rows } = await this.pool.query(query, values);
    return rows.map(r => this.formatRow(r));
  }

  async findById(id) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return null;

    const { rows } = await this.pool.query(
      'SELECT id, title, done, created_at, updated_at FROM tasks WHERE id = $1',
      [numericId]
    );

    return rows.length > 0 ? this.formatRow(rows[0]) : null;
  }

  async create({ title, done = false }) {
    const { rows } = await this.pool.query(
      'INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING id, title, done, created_at, updated_at',
      [title, Boolean(done)]
    );

    return this.formatRow(rows[0]);
  }

  async update(id, { title, done }) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return null;

    // Check existing task
    const existing = await this.findById(numericId);
    if (!existing) return null;

    const updatedTitle = title !== undefined ? title : existing.title;
    const updatedDone = done !== undefined ? Boolean(done) : existing.done;

    const { rows } = await this.pool.query(
      `UPDATE tasks 
       SET title = $1, done = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING id, title, done, created_at, updated_at`,
      [updatedTitle, updatedDone, numericId]
    );

    return rows.length > 0 ? this.formatRow(rows[0]) : null;
  }

  async delete(id) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return false;

    const { rowCount } = await this.pool.query(
      'DELETE FROM tasks WHERE id = $1',
      [numericId]
    );

    return rowCount > 0;
  }

  async getStats() {
    const { rows } = await this.pool.query(`
      SELECT 
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (WHERE done = true)::INTEGER AS completed,
        COUNT(*) FILTER (WHERE done = false)::INTEGER AS pending
      FROM tasks
    `);

    return {
      total: rows[0].total || 0,
      completed: rows[0].completed || 0,
      pending: rows[0].pending || 0
    };
  }

  async reset() {
    await this.pool.query('TRUNCATE TABLE tasks RESTART IDENTITY');
    
    // Seed initial tasks
    const seedQuery = `
      INSERT INTO tasks (title, done) VALUES 
      ('Buy groceries', false),
      ('Walk the dog', false),
      ('Finish backend assignment', true)
      RETURNING id, title, done, created_at, updated_at
    `;
    const { rows } = await this.pool.query(seedQuery);
    return rows.map(r => this.formatRow(r));
  }
}

module.exports = PostgresTaskRepository;

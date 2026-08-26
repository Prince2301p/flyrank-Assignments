const express = require('express');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const { db, initDb, formatTask } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize database schema and seed data if empty
initDb();

// Mount Swagger UI Documentation
try {
  const openapiSpec = require('./openapi.json');
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
} catch (err) {
  console.warn('Swagger UI could not be mounted:', err.message);
}

// GET / - API Info
app.get('/', (req, res) => {
  res.json({
    name: 'Task API (SQLite)',
    version: '2.0',
    database: 'tasks.db',
    endpoints: ['/tasks', '/tasks/:id', '/stats', '/reset', '/docs']
  });
});

// GET /health - Server Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

// GET /tasks - Read all tasks from SQLite with optional query filters
app.get('/tasks', (req, res) => {
  const { done, search, sort } = req.query;

  let query = 'SELECT * FROM tasks';
  const conditions = [];
  const params = [];

  if (done !== undefined) {
    if (done === 'true' || done === '1') {
      conditions.push('done = 1');
    } else if (done === 'false' || done === '0') {
      conditions.push('done = 0');
    }
  }

  if (search) {
    conditions.push('title LIKE ?');
    params.push(`%${search}%`);
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

  const rows = db.prepare(query).all(...params);
  const tasks = rows.map(formatTask);
  res.json(tasks);
});

// GET /tasks/:id - Read single task by id
app.get('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!row) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  res.json(formatTask(row));
});

// POST /tasks - Create a new task in database
app.post('/tasks', (req, res) => {
  const { title, done } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res
      .status(400)
      .json({ error: 'Title is required and cannot be empty' });
  }

  const isDone = done === true || done === 1 ? 1 : 0;
  const stmt = db.prepare(
    'INSERT INTO tasks (title, done) VALUES (?, ?)'
  );
  const info = stmt.run(title.trim(), isDone);

  const newRow = db
    .prepare('SELECT * FROM tasks WHERE id = ?')
    .get(info.lastInsertRowid);

  res.status(201).json(formatTask(newRow));
});

// PUT /tasks/:id - Update task in SQLite database
app.put('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  const existingRow = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existingRow) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  const { title, done } = req.body;

  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }

  const newTitle = title !== undefined ? title.trim() : existingRow.title;
  let newDone = existingRow.done;
  if (done !== undefined) {
    newDone = done === true || done === 1 ? 1 : 0;
  }

  const updateStmt = db.prepare(
    'UPDATE tasks SET title = ?, done = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );
  updateStmt.run(newTitle, newDone, id);

  const updatedRow = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(formatTask(updatedRow));
});

// DELETE /tasks/:id - Delete task from SQLite database
app.delete('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  const existingRow = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existingRow) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.status(204).send();
});

// GET /stats - Return task statistics calculated using SQL COUNT()
app.get('/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) AS done,
      SUM(CASE WHEN done = 0 THEN 1 ELSE 0 END) AS open
    FROM tasks
  `).get();

  res.json({
    total: stats.total || 0,
    done: stats.done || 0,
    open: stats.open || 0
  });
});

// POST /reset - Reset database to initial seed tasks
app.post('/reset', (req, res) => {
  db.prepare('DELETE FROM tasks').run();
  
  // Re-seed 3 initial tasks
  const insertStmt = db.prepare(
    'INSERT INTO tasks (title, done) VALUES (?, ?)'
  );
  const seedTasks = [
    { title: 'Buy groceries', done: 0 },
    { title: 'Walk the dog', done: 0 },
    { title: 'Finish backend assignment', done: 1 }
  ];

  const insertMany = db.transaction((tasks) => {
    for (const task of tasks) {
      insertStmt.run(task.title, task.done);
    }
  });

  insertMany(seedTasks);

  const newTasks = db.prepare('SELECT * FROM tasks').all().map(formatTask);
  res.json({ message: 'Database reset to initial state', tasks: newTasks });
});

let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`Task API server running on http://localhost:${PORT}`);
    console.log(`Interactive API Docs available at http://localhost:${PORT}/docs`);
  });
}

module.exports = app;

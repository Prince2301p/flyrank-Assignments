const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'tasks.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance and concurrency
db.pragma('journal_mode = WAL');

// Initialize schema and seed data
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const countStmt = db.prepare('SELECT COUNT(*) AS count FROM tasks');
  const { count } = countStmt.get();

  if (count === 0) {
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
    console.log('Database initialized with 3 default seed tasks.');
  } else {
    console.log(`Database loaded (${count} tasks existing).`);
  }
}

// Convert SQLite integer (0/1) to JavaScript boolean (false/true)
function formatTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    done: Boolean(row.done),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

module.exports = {
  db,
  initDb,
  formatTask
};

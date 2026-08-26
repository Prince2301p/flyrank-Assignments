/**
 * Stage 4 — Learn your first SQL
 * Demonstrates running raw SQL queries directly against tasks.db using better-sqlite3.
 */

const { db, formatTask } = require('./db');

console.log('====================================================');
console.log('  STAGE 4 — EXECUTING RAW SQL QUERIES ON tasks.db');
console.log('====================================================\n');

// 1. List every task: SELECT * FROM tasks;
console.log('1. Query: SELECT * FROM tasks;');
const allTasks = db.prepare('SELECT * FROM tasks;').all();
console.table(allTasks.map(formatTask));

// 2. Show only completed tasks: SELECT * FROM tasks WHERE done = 1;
console.log('\n2. Query: SELECT * FROM tasks WHERE done = 1;');
const completedTasks = db.prepare('SELECT * FROM tasks WHERE done = 1;').all();
console.table(completedTasks.map(formatTask));

// 3. Count all tasks: SELECT COUNT(*) FROM tasks;
console.log('\n3. Query: SELECT COUNT(*) AS total_tasks FROM tasks;');
const countResult = db.prepare('SELECT COUNT(*) AS total_tasks FROM tasks;').get();
console.log('Total tasks count:', countResult.total_tasks);

// 4. Mark every task as completed: UPDATE tasks SET done = 1;
console.log('\n4. Query: UPDATE tasks SET done = 1;');
const updateResult = db.prepare('UPDATE tasks SET done = 1;').run();
console.log(`Updated ${updateResult.changes} tasks to completed (done = 1).`);

// Verify update
const allCompleted = db.prepare('SELECT * FROM tasks;').all();
console.table(allCompleted.map(formatTask));

// 5. Delete all completed tasks: DELETE FROM tasks WHERE done = 1;
console.log('\n5. Query: DELETE FROM tasks WHERE done = 1;');
const deleteResult = db.prepare('DELETE FROM tasks WHERE done = 1;').run();
console.log(`Deleted ${deleteResult.changes} completed tasks.`);

// Final count check
const finalCount = db.prepare('SELECT COUNT(*) AS remaining FROM tasks;').get();
console.log('\nRemaining tasks in tasks.db:', finalCount.remaining);
console.log('====================================================');

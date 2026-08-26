import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const storageDir = path.join(process.cwd(), 'storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const reportsDir = path.join(storageDir, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

const dbFilePath = path.join(storageDir, 'data.db');
let dbInstance: SqlJsDatabase | null = null;

export async function initDatabase(): Promise<SqlJsDatabase> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(dbFilePath)) {
    const fileBuffer = fs.readFileSync(dbFilePath);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Create Tables
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_tier TEXT NOT NULL,
      product_category TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_name TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL,
      completion_tokens INTEGER NOT NULL,
      latency_ms INTEGER NOT NULL,
      cost_usd REAL NOT NULL,
      status_code INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      report_type TEXT NOT NULL,
      parameters TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      result_url TEXT,
      file_path TEXT,
      file_size_bytes INTEGER,
      page_count INTEGER,
      error_message TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cron_expression TEXT NOT NULL,
      report_type TEXT NOT NULL,
      parameters TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_run_at TEXT,
      next_run_at TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed sample data if empty
  const res = dbInstance.exec('SELECT COUNT(*) as count FROM transactions');
  const count = (res[0]?.values[0][0] as number) || 0;

  if (count === 0) {
    seedDatabase(dbInstance);
  }

  saveDatabase();
  return dbInstance;
}

export function saveDatabase() {
  if (!dbInstance) return;
  const data = dbInstance.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbFilePath, buffer);
}

export function getDb(): SqlJsDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

function seedDatabase(db: SqlJsDatabase) {
  console.log('Seeding dataset into WASM SQLite database...');
  const tiers = ['Enterprise', 'Mid-Market', 'SMB', 'Startup'];
  const categories = ['SaaS Pro Suite', 'Enterprise API Add-on', 'AI Agent License', 'Custom Support SLA'];
  const names = [
    'Acme Corp', 'Apex Global', 'Nexus Systems', 'Starlight Tech', 'Hyperion Dynamics',
    'Quantum Labs', 'Vanguard Media', 'CyberWave', 'Horizon AI', 'Pinnacle Solutions',
    'Synergy Cloud', 'OmniData', 'Pulse Digital', 'Zenith Enterprises', 'Aura Soft'
  ];
  const statuses = ['completed', 'completed', 'completed', 'completed', 'pending', 'refunded'];

  const now = new Date();

  // Transactions
  for (let i = 0; i < 150; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const customer = names[Math.floor(Math.random() * names.length)];
    const tier = tiers[Math.floor(Math.random() * tiers.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const amount = parseFloat((Math.random() * 4500 + 250).toFixed(2));
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    db.run(
      `INSERT INTO transactions (customer_name, customer_tier, product_category, amount, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customer, tier, category, amount, status, date.toISOString()]
    );
  }

  // AI Usage Logs
  const models = ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1-5-pro', 'llama-3-70b'];
  const statusCodes = [200, 200, 200, 200, 200, 200, 200, 429, 500];

  for (let i = 0; i < 300; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const model = models[Math.floor(Math.random() * models.length)];
    const promptTokens = Math.floor(Math.random() * 3000 + 200);
    const completionTokens = Math.floor(Math.random() * 1500 + 100);
    const latencyMs = Math.floor(Math.random() * 2200 + 150);

    let costPer1kPrompt = 0.0025;
    let costPer1kComp = 0.01;
    if (model === 'gpt-4o') { costPer1kPrompt = 0.005; costPer1kComp = 0.015; }
    else if (model === 'gemini-1-5-pro') { costPer1kPrompt = 0.0035; costPer1kComp = 0.0105; }
    else if (model === 'llama-3-70b') { costPer1kPrompt = 0.0008; costPer1kComp = 0.002; }

    const cost = parseFloat((
      (promptTokens / 1000) * costPer1kPrompt + (completionTokens / 1000) * costPer1kComp
    ).toFixed(5));

    const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];

    db.run(
      `INSERT INTO ai_usage_logs (model_name, prompt_tokens, completion_tokens, latency_ms, cost_usd, status_code, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [model, promptTokens, completionTokens, latencyMs, cost, statusCode, date.toISOString()]
    );
  }

  // Seed default schedules
  db.run(
    `INSERT INTO schedules (id, name, cron_expression, report_type, parameters, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    ['sched_exec_daily', 'Daily Executive Summary', '0 0 * * *', 'executive', JSON.stringify({ rangeDays: 30 }), new Date().toISOString()]
  );

  db.run(
    `INSERT INTO schedules (id, name, cron_expression, report_type, parameters, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    ['sched_ai_weekly', 'Weekly AI Engineering Metrics', '0 8 * * 1', 'ai', JSON.stringify({ rangeDays: 7 }), new Date().toISOString()]
  );

  console.log('Dataset seeded successfully.');
}

// SQL Query execution helpers for sql.js
export function queryGet<T = any>(sql: string, params: any[] = []): T | undefined {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result: T | undefined = undefined;
  if (stmt.step()) {
    result = stmt.getAsObject() as T;
  }
  stmt.free();
  return result;
}

export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryRun(sql: string, params: any[] = []): void {
  const db = getDb();
  db.run(sql, params);
  saveDatabase();
}

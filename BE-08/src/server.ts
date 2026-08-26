import { app } from './app.js';
import { initDatabase } from './db/database.js';
import { startWorker } from './jobs/worker.js';
import { initScheduler } from './scheduler/cronScheduler.js';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    // 1. Initialize SQLite Database & seed data
    await initDatabase();
    console.log('Database initialized successfully.');

    // 2. Start background worker process
    startWorker(1000);

    // 3. Initialize cron scheduler
    initScheduler();

    // 4. Start HTTP Server
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` BE-08 PDF Report Generator Service is running!`);
      console.log(` Web Dashboard: http://localhost:${PORT}`);
      console.log(` API Endpoint:  http://localhost:${PORT}/api/reports/generate`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

bootstrap();

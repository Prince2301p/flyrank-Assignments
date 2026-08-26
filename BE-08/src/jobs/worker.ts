import { queryGet } from '../db/database.js';
import { executeJob } from './jobQueue.js';

let isWorkerRunning = false;
let workerInterval: NodeJS.Timeout | null = null;

export function startWorker(intervalMs: number = 1000) {
  if (workerInterval) return;

  console.log(`Starting background report worker (interval: ${intervalMs}ms)...`);
  workerInterval = setInterval(async () => {
    if (isWorkerRunning) return;

    try {
      isWorkerRunning = true;
      // Fetch next pending job
      const pendingJob = queryGet<{ id: string }>(`
        SELECT id FROM jobs
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 1
      `);

      if (pendingJob) {
        console.log(`Worker picked up pending job: ${pendingJob.id}`);
        await executeJob(pendingJob.id);
        console.log(`Worker completed job: ${pendingJob.id}`);
      }
    } catch (err) {
      console.error('Error in background worker process loop:', err);
    } finally {
      isWorkerRunning = false;
    }
  }, intervalMs);
}

export function stopWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('Background report worker stopped.');
  }
}

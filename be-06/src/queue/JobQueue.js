const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const aiService = require('../services/aiService');
const alertService = require('../services/alertService');

class JobQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 2;
    this.maxRetries = options.maxRetries || 3;
    this.initialBackoffMs = options.initialBackoffMs || 1000;
    
    this.jobs = new Map(); // jobId -> job object
    this.idempotencyMap = new Map(); // idempotencyKey -> jobId
    
    this.activeWorkers = 0;
    this.storagePath = path.join(__dirname, '../../data/jobs.json');

    this.ensureDataDir();
    this.loadJobs();
    
    // Start worker loop polling
    this.workerInterval = setInterval(() => this.processNext(), 200);
  }

  ensureDataDir() {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  loadJobs() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const list = JSON.parse(raw);
        for (const job of list) {
          // Reset stuck 'processing' jobs back to 'queued' on startup
          if (job.status === 'processing') {
            job.status = 'queued';
            job.progress = 0;
          }
          this.jobs.set(job.id, job);
          if (job.idempotencyKey) {
            this.idempotencyMap.set(job.idempotencyKey, job.id);
          }
        }
      }
    } catch (err) {
      console.error('[JobQueue] Failed to load jobs from disk:', err.message);
    }
  }

  saveJobs() {
    try {
      const list = Array.from(this.jobs.values());
      fs.writeFileSync(this.storagePath, JSON.stringify(list, null, 2));
    } catch (err) {
      console.error('[JobQueue] Failed to save jobs to disk:', err.message);
    }
  }

  /**
   * Enqueue a new job or return existing job if idempotency match exists
   */
  enqueueJob({ payload, idempotencyKey = null, maxRetries = null }) {
    if (idempotencyKey && this.idempotencyMap.has(idempotencyKey)) {
      const existingJobId = this.idempotencyMap.get(idempotencyKey);
      const existingJob = this.jobs.get(existingJobId);
      if (existingJob) {
        return {
          job: existingJob,
          isDuplicate: true
        };
      }
    }

    const jobId = `job_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const job = {
      id: jobId,
      idempotencyKey,
      payload,
      status: 'queued', // 'queued' | 'processing' | 'completed' | 'failed' | 'dlq'
      progress: 0,
      progressMessage: 'Job enqueued and waiting for worker...',
      attempts: 0,
      maxRetries: maxRetries !== null ? maxRetries : this.maxRetries,
      result: null,
      error: null,
      errorHistory: [],
      createdAt: now,
      startedAt: null,
      completedAt: null,
      nextAttemptAt: null
    };

    this.jobs.set(jobId, job);
    if (idempotencyKey) {
      this.idempotencyMap.set(idempotencyKey, jobId);
    }

    this.saveJobs();

    // Trigger immediate worker check
    setImmediate(() => this.processNext());

    return {
      job,
      isDuplicate: false
    };
  }

  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  getAllJobs({ status = null, limit = 50 } = {}) {
    let list = Array.from(this.jobs.values());
    if (status) {
      list = list.filter((j) => j.status === status);
    }
    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list.slice(0, limit);
  }

  /**
   * Manually retry a job in DLQ
   */
  retryJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'dlq' && job.status !== 'failed') {
      throw new Error(`Job ${jobId} is currently in '${job.status}' status and cannot be retried`);
    }

    job.status = 'queued';
    job.attempts = 0;
    job.progress = 0;
    job.progressMessage = 'Manual retry initiated. Re-enqueued for processing...';
    job.error = null;
    job.nextAttemptAt = null;

    this.saveJobs();
    setImmediate(() => this.processNext());

    return job;
  }

  /**
   * Worker loop to pull and execute jobs
   */
  async processNext() {
    if (this.activeWorkers >= this.concurrency) {
      return;
    }

    const now = Date.now();
    // Find next eligible queued job
    let candidateJob = null;
    for (const job of this.jobs.values()) {
      if (job.status === 'queued') {
        if (!job.nextAttemptAt || new Date(job.nextAttemptAt).getTime() <= now) {
          candidateJob = job;
          break;
        }
      }
    }

    if (!candidateJob) {
      return;
    }

    // Lock job for processing
    this.activeWorkers++;
    candidateJob.status = 'processing';
    candidateJob.attempts += 1;
    candidateJob.startedAt = candidateJob.startedAt || new Date().toISOString();
    candidateJob.progressMessage = `Worker starting attempt ${candidateJob.attempts}/${candidateJob.maxRetries}...`;
    this.saveJobs();

    try {
      const result = await aiService.processAIJob(
        candidateJob.payload,
        (progressPct, stepMsg) => {
          candidateJob.progress = progressPct;
          candidateJob.progressMessage = stepMsg;
          this.saveJobs();
        }
      );

      // Job standard success
      candidateJob.status = 'completed';
      candidateJob.progress = 100;
      candidateJob.progressMessage = 'AI job completed successfully.';
      candidateJob.result = result;
      candidateJob.completedAt = new Date().toISOString();
      this.saveJobs();

    } catch (err) {
      const errorMessage = err.message || 'Unknown error occurred during AI execution';
      candidateJob.errorHistory.push({
        attempt: candidateJob.attempts,
        timestamp: new Date().toISOString(),
        error: errorMessage
      });
      candidateJob.error = errorMessage;

      if (candidateJob.attempts < candidateJob.maxRetries) {
        // Calculate exponential backoff delay + jitter
        const backoffMultiplier = Math.pow(2, candidateJob.attempts - 1);
        const jitterMs = Math.floor(Math.random() * 300);
        const retryDelayMs = (this.initialBackoffMs * backoffMultiplier) + jitterMs;
        const nextAttemptTime = new Date(Date.now() + retryDelayMs).toISOString();

        candidateJob.status = 'queued'; // return to queue with retry timestamp
        candidateJob.progressMessage = `Attempt ${candidateJob.attempts} failed. Scheduled retry in ${(retryDelayMs / 1000).toFixed(1)}s (Backoff attempt ${candidateJob.attempts + 1}/${candidateJob.maxRetries})...`;
        candidateJob.nextAttemptAt = nextAttemptTime;

        console.warn(`[JobQueue] Job ${candidateJob.id} attempt ${candidateJob.attempts} failed. Retrying at ${nextAttemptTime}. Error: ${errorMessage}`);
        
        alertService.triggerAlert('JOB_RETRY', `Job ${candidateJob.id} failed on attempt ${candidateJob.attempts}/${candidateJob.maxRetries}. Will retry in ${(retryDelayMs / 1000).toFixed(1)}s.`, {
          jobId: candidateJob.id,
          attempt: candidateJob.attempts,
          error: errorMessage,
          retryAt: nextAttemptTime
        });

      } else {
        // Move to Dead-Letter Queue (DLQ)
        candidateJob.status = 'dlq';
        candidateJob.progressMessage = `Job permanently failed after ${candidateJob.attempts} attempts. Moved to Dead Letter Queue (DLQ).`;
        candidateJob.completedAt = new Date().toISOString();

        alertService.triggerAlert('DLQ_JOB', `Job ${candidateJob.id} exhausted all ${candidateJob.maxRetries} retries and moved to Dead Letter Queue (DLQ).`, {
          jobId: candidateJob.id,
          attempts: candidateJob.attempts,
          error: errorMessage,
          payload: candidateJob.payload
        });
      }

      this.saveJobs();
    } finally {
      this.activeWorkers--;
      // Try to pick up next job immediately if available
      setImmediate(() => this.processNext());
    }
  }

  getMetrics() {
    const all = Array.from(this.jobs.values());
    return {
      total: all.length,
      queued: all.filter(j => j.status === 'queued').length,
      processing: all.filter(j => j.status === 'processing').length,
      completed: all.filter(j => j.status === 'completed').length,
      dlq: all.filter(j => j.status === 'dlq').length,
      activeWorkers: this.activeWorkers,
      concurrency: this.concurrency
    };
  }
}

module.exports = new JobQueue();

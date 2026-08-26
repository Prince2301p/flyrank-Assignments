const express = require('express');
const router = express.Router();
const jobQueue = require('../queue/JobQueue');
const alertService = require('../services/alertService');
const idempotencyMiddleware = require('../middleware/idempotency');

/**
 * POST /api/v1/jobs/ai-generate
 * Enqueues a slow AI operation. Returns HTTP 202 Accepted immediately.
 */
router.post('/ai-generate', idempotencyMiddleware, (req, res) => {
  const { prompt, taskType = 'generate', simulateError = false, processingTimeMs = 3000, maxRetries = 3 } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({
      error: 'Invalid Request',
      message: 'Field "prompt" is required and must be a non-empty string.'
    });
  }

  const payload = {
    taskType,
    prompt: prompt.trim(),
    simulateError: Boolean(simulateError),
    processingTimeMs: Number(processingTimeMs) || 3000
  };

  const idempotencyKey = req.idempotencyKey || req.body.idempotencyKey || null;

  const { job, isDuplicate } = jobQueue.enqueueJob({
    payload,
    idempotencyKey,
    maxRetries: Number(maxRetries) || 3
  });

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const statusUrl = `${baseUrl}/api/v1/jobs/${job.id}`;

  // HTTP 202 ACCEPTED
  return res.status(202).json({
    status: 'accepted',
    message: isDuplicate 
      ? 'Duplicate job request detected via Idempotency-Key. Returning existing background job status.' 
      : 'AI background job accepted for processing.',
    isDuplicate,
    jobId: job.id,
    idempotencyKey: job.idempotencyKey,
    jobStatus: job.status,
    progress: job.progress,
    attempts: job.attempts,
    statusUrl,
    estimatedDurationMs: payload.processingTimeMs,
    createdAt: job.createdAt
  });
});

/**
 * GET /api/v1/jobs/:id
 * Status endpoint to check real-time job execution state & result payload
 */
router.get('/:id', (req, res) => {
  const jobId = req.params.id;
  const job = jobQueue.getJob(jobId);

  if (!job) {
    return res.status(404).json({
      error: 'Not Found',
      message: `No job found with ID "${jobId}"`
    });
  }

  return res.status(200).json({
    jobId: job.id,
    idempotencyKey: job.idempotencyKey,
    status: job.status,
    progress: job.progress,
    progressMessage: job.progressMessage,
    attempts: job.attempts,
    maxRetries: job.maxRetries,
    payload: job.payload,
    result: job.result,
    error: job.error,
    errorHistory: job.errorHistory,
    nextAttemptAt: job.nextAttemptAt,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt
  });
});

/**
 * GET /api/v1/jobs
 * List background jobs with optional status filtering
 */
router.get('/', (req, res) => {
  const { status, limit } = req.query;
  const jobs = jobQueue.getAllJobs({
    status: status ? status.toString().toLowerCase() : null,
    limit: limit ? parseInt(limit, 10) : 50
  });

  const metrics = jobQueue.getMetrics();

  return res.status(200).json({
    metrics,
    count: jobs.length,
    jobs
  });
});

/**
 * POST /api/v1/jobs/:id/retry
 * Manually retry a failed/DLQ job
 */
router.post('/:id/retry', (req, res) => {
  const jobId = req.params.id;
  try {
    const job = jobQueue.retryJob(jobId);
    return res.status(200).json({
      message: `Job ${jobId} successfully re-enqueued for retry.`,
      job
    });
  } catch (err) {
    return res.status(400).json({
      error: 'Retry Failed',
      message: err.message
    });
  }
});

/**
 * GET /api/v1/alerts
 * Returns system failure alerts & DLQ log entries
 */
router.get('/system/alerts', (req, res) => {
  const alerts = alertService.getAlerts();
  return res.status(200).json({
    count: alerts.length,
    alerts
  });
});

/**
 * DELETE /api/v1/alerts
 * Clears alerts feed
 */
router.delete('/system/alerts', (req, res) => {
  alertService.clearAlerts();
  return res.status(200).json({
    message: 'System alerts cleared successfully.'
  });
});

module.exports = router;

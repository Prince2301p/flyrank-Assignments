import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createJob, getJob, getAllJobs } from '../jobs/jobQueue.js';
import { getExecutiveData } from '../db/queries.js';
import { getSchedules, createSchedule, deleteSchedule, triggerSchedule } from '../scheduler/cronScheduler.js';

export const reportRouter = Router();

// 1. Trigger On-Demand Report Generation (Background Job)
reportRouter.post('/reports/generate', (req: Request, res: Response) => {
  try {
    const { reportType = 'executive', rangeDays = 30, startDate, endDate } = req.body;

    if (!['executive', 'ai', 'financial'].includes(reportType)) {
      res.status(400).json({ error: "Invalid reportType. Must be 'executive', 'ai', or 'financial'." });
      return;
    }

    const parameters = { rangeDays: Number(rangeDays) || 30, startDate, endDate };
    const job = createJob(reportType, parameters);

    res.status(202).json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: 'Report generation job successfully queued in background.',
      statusUrl: `/api/reports/jobs/${job.id}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to enqueue report job' });
  }
});

// 2. Poll Background Job Status & Progress
reportRouter.get('/reports/jobs/:id', (req: Request, res: Response) => {
  const jobId = String(req.params.id);
  const job = getJob(jobId);

  if (!job) {
    res.status(404).json({ error: `Job ${jobId} not found` });
    return;
  }

  res.json({
    id: job.id,
    reportType: job.report_type,
    status: job.status,
    progress: job.progress,
    resultUrl: job.result_url,
    fileSizeBytes: job.file_size_bytes,
    pageCount: job.page_count,
    errorMessage: job.error_message,
    createdAt: job.created_at,
    completedAt: job.completed_at
  });
});

// 3. List Past Report Jobs
reportRouter.get('/reports/jobs', (req: Request, res: Response) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const jobs = getAllJobs(limit);
  res.json({ jobs });
});

// 4. Download / Serve PDF Artifact
reportRouter.get('/reports/download/:filename', (req: Request, res: Response) => {
  const filename = String(req.params.filename);
  const safeFilename = path.basename(filename);
  const filePath = path.join(process.cwd(), 'storage', 'reports', safeFilename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'PDF report artifact not found' });
    return;
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

// 5. Fetch Aggregated Live Preview Data
reportRouter.get('/reports/preview-data', (req: Request, res: Response) => {
  const rangeDays = Number(req.query.rangeDays) || 30;
  const data = getExecutiveData(rangeDays);
  res.json(data);
});

// 6. Schedules API (Stretch Feature)
reportRouter.get('/schedules', (req: Request, res: Response) => {
  const schedules = getSchedules();
  res.json({ schedules });
});

reportRouter.post('/schedules', (req: Request, res: Response) => {
  try {
    const { name, cronExpression, reportType = 'executive', rangeDays = 30 } = req.body;
    if (!name || !cronExpression) {
      res.status(400).json({ error: 'Missing required parameters: name and cronExpression' });
      return;
    }

    const schedule = createSchedule(name, cronExpression, reportType, { rangeDays });
    res.status(201).json({ success: true, schedule });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create schedule' });
  }
});

reportRouter.delete('/schedules/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const success = deleteSchedule(id);
  res.json({ success });
});

reportRouter.post('/schedules/:id/trigger', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const job = triggerSchedule(id);
    res.status(202).json({
      success: true,
      jobId: job.id,
      message: 'Scheduled report triggered on-demand'
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

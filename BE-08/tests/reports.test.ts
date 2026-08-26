import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from '../src/app.js';
import { initDatabase } from '../src/db/database.js';
import { getFinancialSummary, getAISummary, getExecutiveData } from '../src/db/queries.js';
import { generatePdfReport } from '../src/reports/pdfGenerator.js';
import { createJob, executeJob, getJob } from '../src/jobs/jobQueue.js';
import { createSchedule, getSchedules, deleteSchedule } from '../src/scheduler/cronScheduler.js';

describe('BE-08 PDF Report Generator Test Suite', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  describe('1. SQL Data Aggregations', () => {
    it('should aggregate financial summary stats correctly', () => {
      const summary = getFinancialSummary();
      expect(summary.totalRevenue).toBeGreaterThan(0);
      expect(summary.totalTransactions).toBeGreaterThan(0);
      expect(summary.categoryBreakdown.length).toBeGreaterThan(0);
      expect(summary.tierBreakdown.length).toBeGreaterThan(0);
    });

    it('should aggregate AI infrastructure metrics correctly', () => {
      const aiSummary = getAISummary();
      expect(aiSummary.totalRequests).toBeGreaterThan(0);
      expect(aiSummary.totalTokens).toBeGreaterThan(0);
      expect(aiSummary.modelBreakdown.length).toBeGreaterThan(0);
      expect(aiSummary.slaComplianceRate).toBeGreaterThanOrEqual(0);
      expect(aiSummary.slaComplianceRate).toBeLessThanOrEqual(100);
    });

    it('should compile complete executive report dataset', () => {
      const execData = getExecutiveData(30);
      expect(execData.financial).toBeDefined();
      expect(execData.ai).toBeDefined();
      expect(execData.startDate).toBeDefined();
      expect(execData.endDate).toBeDefined();
    });
  });

  describe('2. PDF Report Generator Engine', () => {
    it('should render a valid PDF file with magic bytes %PDF-', async () => {
      const testPdfPath = path.join(process.cwd(), 'storage', 'reports', 'test_exec_report.pdf');
      if (fs.existsSync(testPdfPath)) fs.unlinkSync(testPdfPath);

      const result = await generatePdfReport('executive', { rangeDays: 30 }, testPdfPath);

      expect(fs.existsSync(testPdfPath)).toBe(true);
      expect(result.fileSizeBytes).toBeGreaterThan(500);
      expect(result.pageCount).toBeGreaterThan(0);

      // Check PDF header signature
      const buffer = fs.readFileSync(testPdfPath);
      const headerStr = buffer.toString('utf8', 0, 5);
      expect(headerStr).toBe('%PDF-');
    });

    it('should render AI SLA report PDF', async () => {
      const testAiPdfPath = path.join(process.cwd(), 'storage', 'reports', 'test_ai_report.pdf');
      const result = await generatePdfReport('ai', { rangeDays: 7 }, testAiPdfPath);
      expect(result.fileSizeBytes).toBeGreaterThan(500);
    });
  });

  describe('3. Background Job Queue (A7 Pattern)', () => {
    it('should create a pending job and process it asynchronously to completion', async () => {
      const job = createJob('executive', { rangeDays: 30 });
      expect(job.id).toBeDefined();
      expect(job.status).toBe('pending');
      expect(job.progress).toBe(0);

      const completedJob = await executeJob(job.id);
      expect(completedJob.status).toBe('completed');
      expect(completedJob.progress).toBe(100);
      expect(completedJob.result_url).toContain('/api/reports/download/');
      expect(completedJob.file_size_bytes).toBeGreaterThan(500);

      // Verify stored file on disk
      expect(fs.existsSync(completedJob.file_path!)).toBe(true);
    });
  });

  describe('4. REST API & Artifact Downloads', () => {
    let testJobId: string;
    let downloadUrl: string;

    it('POST /api/reports/generate should return 202 Accepted with jobId', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .send({ reportType: 'ai', rangeDays: 14 });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBeDefined();
      testJobId = res.body.jobId;
    });

    it('GET /api/reports/jobs/:id should return job status and progress', async () => {
      // Execute the job to completion for testing
      await executeJob(testJobId);

      const res = await request(app).get(`/api/reports/jobs/${testJobId}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.progress).toBe(100);
      expect(res.body.resultUrl).toBeDefined();
      downloadUrl = res.body.resultUrl;
    });

    it('GET /api/reports/download/:filename should serve PDF file with application/pdf header', async () => {
      const filename = path.basename(downloadUrl);
      const res = await request(app).get(`/api/reports/download/${filename}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.body.length).toBeGreaterThan(500);
    });

    it('GET /api/reports/preview-data should return aggregated summary JSON', async () => {
      const res = await request(app).get('/api/reports/preview-data?rangeDays=30');
      expect(res.status).toBe(200);
      expect(res.body.financial).toBeDefined();
      expect(res.body.ai).toBeDefined();
    });
  });

  describe('5. Cron Scheduler API (Stretch Goal)', () => {
    let schedId: string;

    it('POST /api/schedules should register a new cron schedule', async () => {
      const res = await request(app)
        .post('/api/schedules')
        .send({
          name: 'Monthly Audit Report',
          cronExpression: '0 0 1 * *',
          reportType: 'financial'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.schedule.id).toBeDefined();
      schedId = res.body.schedule.id;
    });

    it('GET /api/schedules should list registered schedules', async () => {
      const res = await request(app).get('/api/schedules');
      expect(res.status).toBe(200);
      expect(res.body.schedules.length).toBeGreaterThan(0);
    });

    it('DELETE /api/schedules/:id should delete schedule', async () => {
      const res = await request(app).delete(`/api/schedules/${schedId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

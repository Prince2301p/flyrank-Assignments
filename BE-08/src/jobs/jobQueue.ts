import { queryGet, queryAll, queryRun } from '../db/database.js';
import { generatePdfReport } from '../reports/pdfGenerator.js';
import path from 'path';

export interface JobRecord {
  id: string;
  report_type: string;
  parameters: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result_url?: string;
  file_path?: string;
  file_size_bytes?: number;
  page_count?: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export function createJob(reportType: string, parameters: any = {}): JobRecord {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  queryRun(
    `INSERT INTO jobs (id, report_type, parameters, status, progress, created_at)
     VALUES (?, ?, ?, 'pending', 0, ?)`,
    [jobId, reportType, JSON.stringify(parameters), now]
  );

  return getJob(jobId)!;
}

export function getJob(jobId: string): JobRecord | null {
  const row = queryGet<any>('SELECT * FROM jobs WHERE id = ?', [jobId]);
  if (!row) return null;

  return {
    ...row,
    parameters: JSON.parse(row.parameters || '{}')
  };
}

export function getAllJobs(limit: number = 20): JobRecord[] {
  const rows = queryAll<any>('SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?', [limit]);
  return rows.map(row => ({
    ...row,
    parameters: JSON.parse(row.parameters || '{}')
  }));
}

export async function executeJob(jobId: string): Promise<JobRecord> {
  const job = getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);

  const now = new Date().toISOString();

  // Step 1: Set to processing (10%)
  queryRun(
    `UPDATE jobs
     SET status = 'processing', progress = 10, started_at = ?
     WHERE id = ?`,
    [now, jobId]
  );

  try {
    // Step 2: Querying data (40%)
    queryRun('UPDATE jobs SET progress = 40 WHERE id = ?', [jobId]);

    // Step 3: Rendering PDF (70%)
    queryRun('UPDATE jobs SET progress = 70 WHERE id = ?', [jobId]);

    const fileName = `report_${jobId}.pdf`;
    const outputPath = path.join(process.cwd(), 'storage', 'reports', fileName);

    const pdfResult = await generatePdfReport(job.report_type, job.parameters, outputPath);

    // Step 4: Storing artifact & completed (100%)
    const completedAt = new Date().toISOString();
    const downloadUrl = `/api/reports/download/${fileName}`;

    queryRun(
      `UPDATE jobs
       SET status = 'completed', progress = 100, result_url = ?, file_path = ?, file_size_bytes = ?, page_count = ?, completed_at = ?
       WHERE id = ?`,
      [downloadUrl, pdfResult.filePath, pdfResult.fileSizeBytes, pdfResult.pageCount, completedAt, jobId]
    );

    return getJob(jobId)!;
  } catch (error: any) {
    queryRun(
      `UPDATE jobs
       SET status = 'failed', progress = 0, error_message = ?
       WHERE id = ?`,
      [error.message || 'Unknown error generating PDF', jobId]
    );

    return getJob(jobId)!;
  }
}

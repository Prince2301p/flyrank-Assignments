import cron, { ScheduledTask } from 'node-cron';
import { queryGet, queryAll, queryRun } from '../db/database.js';
import { createJob } from '../jobs/jobQueue.js';

export interface ScheduleRecord {
  id: string;
  name: string;
  cron_expression: string;
  report_type: string;
  parameters: any;
  is_active: number;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
}

const activeCronTasks = new Map<string, ScheduledTask>();

export function initScheduler() {
  console.log('Initializing scheduled report cron engine...');
  const schedules = getSchedules();

  schedules.forEach(sched => {
    if (sched.is_active) {
      registerCronTask(sched);
    }
  });
}

function registerCronTask(sched: ScheduleRecord) {
  if (!cron.validate(sched.cron_expression)) {
    console.warn(`Invalid cron expression for schedule ${sched.id}: ${sched.cron_expression}`);
    return;
  }

  // Cancel existing if any
  if (activeCronTasks.has(sched.id)) {
    activeCronTasks.get(sched.id)?.stop();
    activeCronTasks.delete(sched.id);
  }

  const task = cron.schedule(sched.cron_expression, () => {
    console.log(`Cron triggered for schedule: ${sched.name} (${sched.id})`);
    const now = new Date().toISOString();

    // Enqueue background report job
    const job = createJob(sched.report_type, sched.parameters);

    // Update schedule record
    queryRun('UPDATE schedules SET last_run_at = ? WHERE id = ?', [now, sched.id]);

    console.log(`Schedule ${sched.id} enqueued report job ${job.id}`);
  });

  activeCronTasks.set(sched.id, task);
  console.log(`Registered cron schedule '${sched.name}' [${sched.cron_expression}]`);
}

export function getSchedules(): ScheduleRecord[] {
  const rows = queryAll<any>('SELECT * FROM schedules ORDER BY created_at DESC');
  return rows.map(r => ({
    ...r,
    parameters: JSON.parse(r.parameters || '{}')
  }));
}

export function createSchedule(name: string, cronExpression: string, reportType: string, parameters: any = {}): ScheduleRecord {
  if (!cron.validate(cronExpression)) {
    throw new Error(`Invalid cron expression '${cronExpression}'`);
  }

  const id = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  queryRun(
    `INSERT INTO schedules (id, name, cron_expression, report_type, parameters, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [id, name, cronExpression, reportType, JSON.stringify(parameters), now]
  );

  const newSched = queryGet<any>('SELECT * FROM schedules WHERE id = ?', [id]);
  const record: ScheduleRecord = {
    ...newSched,
    parameters: JSON.parse(newSched.parameters || '{}')
  };

  registerCronTask(record);
  return record;
}

export function deleteSchedule(id: string): boolean {
  if (activeCronTasks.has(id)) {
    activeCronTasks.get(id)?.stop();
    activeCronTasks.delete(id);
  }

  queryRun('DELETE FROM schedules WHERE id = ?', [id]);
  return true;
}

export function triggerSchedule(id: string) {
  const sched = queryGet<any>('SELECT * FROM schedules WHERE id = ?', [id]);
  if (!sched) throw new Error(`Schedule ${id} not found`);

  const parameters = JSON.parse(sched.parameters || '{}');
  const job = createJob(sched.report_type, parameters);

  const now = new Date().toISOString();
  queryRun('UPDATE schedules SET last_run_at = ? WHERE id = ?', [now, id]);

  return job;
}

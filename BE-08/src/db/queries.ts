import { queryGet, queryAll } from './database.js';

export interface FinancialSummary {
  totalRevenue: number;
  totalTransactions: number;
  avgOrderValue: number;
  completedTransactions: number;
  pendingTransactions: number;
  refundedTransactions: number;
  categoryBreakdown: { category: string; revenue: number; tx_count: number }[];
  tierBreakdown: { tier: string; revenue: number; tx_count: number }[];
  recentTransactions: {
    id: number;
    customer_name: string;
    customer_tier: string;
    product_category: string;
    amount: number;
    status: string;
    created_at: string;
  }[];
}

export interface AISummary {
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  slaComplianceRate: number;
  modelBreakdown: {
    model_name: string;
    request_count: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_cost: number;
    avg_latency: number;
  }[];
  statusCodeBreakdown: { status_code: number; count: number }[];
}

export interface ExecutiveReportData {
  startDate: string;
  endDate: string;
  financial: FinancialSummary;
  ai: AISummary;
}

export function getFinancialSummary(startDate?: string, endDate?: string): FinancialSummary {
  let dateClause = '';
  const params: any[] = [];

  if (startDate && endDate) {
    dateClause = ' WHERE created_at >= ? AND created_at <= ?';
    params.push(startDate, endDate);
  }

  // General KPIs
  const kpiRow = queryGet<any>(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as totalRevenue,
      COUNT(*) as totalTransactions,
      COALESCE(AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END), 0) as avgOrderValue,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completedTransactions,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pendingTransactions,
      COALESCE(SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END), 0) as refundedTransactions
    FROM transactions
    ${dateClause}
  `, params) || {};

  // Category breakdown
  const categoryRows = queryAll<any>(`
    SELECT
      product_category as category,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as revenue,
      COUNT(*) as tx_count
    FROM transactions
    ${dateClause}
    GROUP BY product_category
    ORDER BY revenue DESC
  `, params);

  // Tier breakdown
  const tierRows = queryAll<any>(`
    SELECT
      customer_tier as tier,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as revenue,
      COUNT(*) as tx_count
    FROM transactions
    ${dateClause}
    GROUP BY customer_tier
    ORDER BY revenue DESC
  `, params);

  // Recent transactions
  const recent = queryAll<any>(`
    SELECT id, customer_name, customer_tier, product_category, amount, status, created_at
    FROM transactions
    ${dateClause}
    ORDER BY created_at DESC
    LIMIT 12
  `, params);

  return {
    totalRevenue: parseFloat((kpiRow.totalRevenue || 0).toFixed(2)),
    totalTransactions: kpiRow.totalTransactions || 0,
    avgOrderValue: parseFloat((kpiRow.avgOrderValue || 0).toFixed(2)),
    completedTransactions: kpiRow.completedTransactions || 0,
    pendingTransactions: kpiRow.pendingTransactions || 0,
    refundedTransactions: kpiRow.refundedTransactions || 0,
    categoryBreakdown: categoryRows.map(r => ({ ...r, revenue: parseFloat((r.revenue || 0).toFixed(2)) })),
    tierBreakdown: tierRows.map(r => ({ ...r, revenue: parseFloat((r.revenue || 0).toFixed(2)) })),
    recentTransactions: recent
  };
}

export function getAISummary(startDate?: string, endDate?: string): AISummary {
  let dateClause = '';
  const params: any[] = [];

  if (startDate && endDate) {
    dateClause = ' WHERE created_at >= ? AND created_at <= ?';
    params.push(startDate, endDate);
  }

  const kpiRow = queryGet<any>(`
    SELECT
      COUNT(*) as totalRequests,
      COALESCE(SUM(prompt_tokens), 0) as totalPromptTokens,
      COALESCE(SUM(completion_tokens), 0) as totalCompletionTokens,
      COALESCE(SUM(cost_usd), 0) as totalCostUsd,
      COALESCE(AVG(latency_ms), 0) as avgLatencyMs,
      COALESCE(SUM(CASE WHEN status_code = 200 THEN 1 ELSE 0 END), 0) as successCount
    FROM ai_usage_logs
    ${dateClause}
  `, params) || {};

  const totalRequests = kpiRow.totalRequests || 0;
  const successCount = kpiRow.successCount || 0;
  const slaRate = totalRequests > 0 ? parseFloat(((successCount / totalRequests) * 100).toFixed(2)) : 100;

  const modelRows = queryAll<any>(`
    SELECT
      model_name,
      COUNT(*) as request_count,
      COALESCE(SUM(prompt_tokens), 0) as total_prompt_tokens,
      COALESCE(SUM(completion_tokens), 0) as total_completion_tokens,
      COALESCE(SUM(cost_usd), 0) as total_cost,
      COALESCE(AVG(latency_ms), 0) as avg_latency
    FROM ai_usage_logs
    ${dateClause}
    GROUP BY model_name
    ORDER BY request_count DESC
  `, params);

  const statusRows = queryAll<any>(`
    SELECT status_code, COUNT(*) as count
    FROM ai_usage_logs
    ${dateClause}
    GROUP BY status_code
    ORDER BY count DESC
  `, params);

  return {
    totalRequests,
    totalPromptTokens: kpiRow.totalPromptTokens || 0,
    totalCompletionTokens: kpiRow.totalCompletionTokens || 0,
    totalTokens: (kpiRow.totalPromptTokens || 0) + (kpiRow.totalCompletionTokens || 0),
    totalCostUsd: parseFloat((kpiRow.totalCostUsd || 0).toFixed(4)),
    avgLatencyMs: Math.round(kpiRow.avgLatencyMs || 0),
    slaComplianceRate: slaRate,
    modelBreakdown: modelRows.map(r => ({
      ...r,
      total_cost: parseFloat((r.total_cost || 0).toFixed(4)),
      avg_latency: Math.round(r.avg_latency || 0)
    })),
    statusCodeBreakdown: statusRows
  };
}

export function getExecutiveData(rangeDays: number = 30): ExecutiveReportData {
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

  return {
    startDate,
    endDate,
    financial: getFinancialSummary(startDate, endDate),
    ai: getAISummary(startDate, endDate)
  };
}

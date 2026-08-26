import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { getFinancialSummary, getAISummary, getExecutiveData, ExecutiveReportData, FinancialSummary, AISummary } from '../db/queries.js';

export interface PDFGeneratorResult {
  filePath: string;
  fileSizeBytes: number;
  pageCount: number;
}

export async function generatePdfReport(
  reportType: string,
  parameters: { startDate?: string; endDate?: string; rangeDays?: number } = {},
  outputPath: string
): Promise<PDFGeneratorResult> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        bufferPages: true
      });

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Data fetching based on report type
      const rangeDays = parameters.rangeDays || 30;
      const data = getExecutiveData(rangeDays);

      if (reportType === 'ai') {
        renderAIReport(doc, data.ai, data.startDate, data.endDate);
      } else if (reportType === 'financial') {
        renderFinancialReport(doc, data.financial, data.startDate, data.endDate);
      } else {
        renderExecutiveReport(doc, data, data.startDate, data.endDate);
      }

      // Add Page Numbers to all pages
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc, i + 1, pages.count);
      }

      doc.end();

      writeStream.on('finish', () => {
        const stats = fs.statSync(outputPath);
        resolve({
          filePath: outputPath,
          fileSizeBytes: stats.size,
          pageCount: pages.count
        });
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function drawHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  // Top Banner background
  doc.rect(0, 0, 595.28, 80).fill('#0F172A');

  // Title Accent line
  doc.rect(40, 20, 6, 40).fill('#38BDF8');

  // Title Text
  doc.fillColor('#FFFFFF')
     .fontSize(18)
     .font('Helvetica-Bold')
     .text(title, 55, 23);

  doc.fillColor('#94A3B8')
     .fontSize(9)
     .font('Helvetica')
     .text(subtitle, 55, 47);

  // Logo / System Badge
  doc.roundedRect(480, 25, 75, 30, 4).fill('#1E293B');
  doc.fillColor('#38BDF8')
     .fontSize(9)
     .font('Helvetica-Bold')
     .text('BE-08 AGY', 492, 35);

  doc.y = 100;
}

function drawFooter(doc: PDFKit.PDFDocument, pageNum: number, totalPages: number) {
  const bottomY = 800;
  doc.rect(40, bottomY, 515.28, 1).fill('#E2E8F0');

  doc.fillColor('#64748B')
     .fontSize(8)
     .font('Helvetica')
     .text(`Generated on ${new Date().toLocaleString()} | Confidential & Proprietary`, 40, bottomY + 10, { width: 350 });

  doc.text(`Page ${pageNum} of ${totalPages}`, 440, bottomY + 10, { width: 115, align: 'right' });
}

function drawKpiCard(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, label: string, value: string, accentColor: string) {
  // Card container
  doc.roundedRect(x, y, width, height, 6).fill('#F8FAFC');
  doc.roundedRect(x, y, width, height, 6).stroke('#E2E8F0');

  // Left colored border bar
  doc.rect(x, y, 5, height).fill(accentColor);

  // Content
  doc.fillColor('#475569')
     .fontSize(8)
     .font('Helvetica-Bold')
     .text(label.toUpperCase(), x + 15, y + 12);

  doc.fillColor('#0F172A')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text(value, x + 15, y + 30);
}

function renderExecutiveReport(doc: PDFKit.PDFDocument, data: ExecutiveReportData, startDate: string, endDate: string) {
  const dateStr = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
  drawHeader(doc, 'Executive Performance Report', `SaaS Revenue & AI Infrastructure Analytics (${dateStr})`);

  // Section 1: KPI Summary Cards
  doc.fillColor('#0F172A').fontSize(13).font('Helvetica-Bold').text('Key Metric Overview', 40, 100);

  const cardWidth = 120;
  const cardHeight = 60;
  const gap = 12;

  drawKpiCard(doc, 40, 125, cardWidth, cardHeight, 'Total Revenue', `$${data.financial.totalRevenue.toLocaleString()}`, '#0EA5E9');
  drawKpiCard(doc, 40 + cardWidth + gap, 125, cardWidth, cardHeight, 'Total Orders', data.financial.totalTransactions.toLocaleString(), '#10B981');
  drawKpiCard(doc, 40 + (cardWidth + gap) * 2, 125, cardWidth, cardHeight, 'AI Tokens', `${(data.ai.totalTokens / 1000000).toFixed(2)}M`, '#8B5CF6');
  drawKpiCard(doc, 40 + (cardWidth + gap) * 3, 125, cardWidth, cardHeight, 'SLA Compliance', `${data.ai.slaComplianceRate}%`, '#F59E0B');

  // Section 2: Financial Performance Table
  let currentY = 210;
  doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('Revenue Breakdown by Product Category', 40, currentY);

  currentY += 20;
  drawTableHeaders(doc, currentY, ['Product Category', 'Transactions', 'Total Revenue ($)', '% Share']);

  currentY += 22;
  const totalRev = data.financial.totalRevenue || 1;
  data.financial.categoryBreakdown.forEach((row, idx) => {
    const share = ((row.revenue / totalRev) * 100).toFixed(1) + '%';
    const bg = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';

    doc.rect(40, currentY - 4, 515.28, 20).fill(bg);
    doc.fillColor('#1E293B').fontSize(9).font('Helvetica')
       .text(row.category, 50, currentY)
       .text(row.tx_count.toString(), 220, currentY)
       .text(`$${row.revenue.toLocaleString()}`, 330, currentY)
       .text(share, 460, currentY);

    currentY += 20;
  });

  // Section 3: AI Model Usage & Performance Table
  currentY += 25;
  doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('AI LLM Engine Performance & Costs', 40, currentY);

  currentY += 20;
  drawTableHeaders(doc, currentY, ['Model Name', 'Requests', 'Total Tokens', 'Avg Latency', 'Cost ($)']);

  currentY += 22;
  data.ai.modelBreakdown.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
    const totalTokens = (row.total_prompt_tokens + row.total_completion_tokens).toLocaleString();

    doc.rect(40, currentY - 4, 515.28, 20).fill(bg);
    doc.fillColor('#1E293B').fontSize(9).font('Helvetica')
       .text(row.model_name, 50, currentY)
       .text(row.request_count.toString(), 180, currentY)
       .text(totalTokens, 270, currentY)
       .text(`${row.avg_latency} ms`, 380, currentY)
       .text(`$${row.total_cost.toFixed(4)}`, 470, currentY);

    currentY += 20;
  });

  // Section 4: Customer Tier Analysis
  currentY += 25;
  doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('Customer Tier Revenue Share', 40, currentY);

  currentY += 20;
  data.financial.tierBreakdown.forEach((tier) => {
    const sharePct = (tier.revenue / totalRev);
    const barWidth = Math.max(10, sharePct * 300);

    doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text(tier.tier, 40, currentY);
    doc.rect(130, currentY, 300, 12).fill('#E2E8F0');
    doc.rect(130, currentY, barWidth, 12).fill('#0EA5E9');

    doc.fillColor('#0F172A').fontSize(9).font('Helvetica')
       .text(`$${tier.revenue.toLocaleString()} (${(sharePct * 100).toFixed(1)}%)`, 440, currentY);

    currentY += 22;
  });
}

function renderAIReport(doc: PDFKit.PDFDocument, data: AISummary, startDate: string, endDate: string) {
  const dateStr = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
  drawHeader(doc, 'AI Infrastructure & SLA Report', `LLM Token Consumption, Latencies & Errors (${dateStr})`);

  doc.fillColor('#0F172A').fontSize(13).font('Helvetica-Bold').text('AI Core Metrics', 40, 100);

  const cardWidth = 120;
  const cardHeight = 60;
  const gap = 12;

  drawKpiCard(doc, 40, 125, cardWidth, cardHeight, 'Total API Calls', data.totalRequests.toLocaleString(), '#0EA5E9');
  drawKpiCard(doc, 40 + cardWidth + gap, 125, cardWidth, cardHeight, 'Total Cost', `$${data.totalCostUsd.toFixed(2)}`, '#10B981');
  drawKpiCard(doc, 40 + (cardWidth + gap) * 2, 125, cardWidth, cardHeight, 'Avg Latency', `${data.avgLatencyMs} ms`, '#6366F1');
  drawKpiCard(doc, 40 + (cardWidth + gap) * 3, 125, cardWidth, cardHeight, 'Uptime SLA', `${data.slaComplianceRate}%`, '#F59E0B');

  let currentY = 210;
  doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('Model Utilization Details', 40, currentY);

  currentY += 20;
  drawTableHeaders(doc, currentY, ['Model', 'Calls', 'Prompt Tokens', 'Comp Tokens', 'Avg Latency', 'Cost']);

  currentY += 22;
  data.modelBreakdown.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
    doc.rect(40, currentY - 4, 515.28, 20).fill(bg);
    doc.fillColor('#1E293B').fontSize(9).font('Helvetica')
       .text(row.model_name, 50, currentY)
       .text(row.request_count.toString(), 150, currentY)
       .text(row.total_prompt_tokens.toLocaleString(), 220, currentY)
       .text(row.total_completion_tokens.toLocaleString(), 310, currentY)
       .text(`${row.avg_latency} ms`, 400, currentY)
       .text(`$${row.total_cost.toFixed(4)}`, 480, currentY);

    currentY += 20;
  });

  currentY += 25;
  doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('API HTTP Response Code Distribution', 40, currentY);

  currentY += 20;
  drawTableHeaders(doc, currentY, ['Status Code', 'Status Type', 'Total Responses', 'Percentage']);

  currentY += 22;
  data.statusCodeBreakdown.forEach((row, idx) => {
    const type = row.status_code === 200 ? 'SUCCESS (200 OK)' : row.status_code === 429 ? 'RATE LIMIT (429)' : 'SERVER ERROR (500)';
    const pct = ((row.count / data.totalRequests) * 100).toFixed(2) + '%';
    const bg = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';

    doc.rect(40, currentY - 4, 515.28, 20).fill(bg);
    doc.fillColor('#1E293B').fontSize(9).font('Helvetica')
       .text(row.status_code.toString(), 50, currentY)
       .text(type, 150, currentY)
       .text(row.count.toLocaleString(), 330, currentY)
       .text(pct, 460, currentY);

    currentY += 20;
  });
}

function renderFinancialReport(doc: PDFKit.PDFDocument, data: FinancialSummary, startDate: string, endDate: string) {
  const dateStr = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
  drawHeader(doc, 'SaaS Financial & Revenue Report', `Transaction Ledger, Tier Breakdown & AOV (${dateStr})`);

  doc.fillColor('#0F172A').fontSize(13).font('Helvetica-Bold').text('Financial Key Highlights', 40, 100);

  const cardWidth = 120;
  const cardHeight = 60;
  const gap = 12;

  drawKpiCard(doc, 40, 125, cardWidth, cardHeight, 'Gross Revenue', `$${data.totalRevenue.toLocaleString()}`, '#10B981');
  drawKpiCard(doc, 40 + cardWidth + gap, 125, cardWidth, cardHeight, 'Avg Order Value', `$${data.avgOrderValue.toFixed(2)}`, '#0EA5E9');
  drawKpiCard(doc, 40 + (cardWidth + gap) * 2, 125, cardWidth, cardHeight, 'Completed Orders', data.completedTransactions.toString(), '#6366F1');
  drawKpiCard(doc, 40 + (cardWidth + gap) * 3, 125, cardWidth, cardHeight, 'Refunds', data.refundedTransactions.toString(), '#EF4444');

  let currentY = 210;
  doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('Recent Transactions Audit Ledger', 40, currentY);

  currentY += 20;
  drawTableHeaders(doc, currentY, ['Customer Name', 'Tier', 'Product Category', 'Amount ($)', 'Status']);

  currentY += 22;
  data.recentTransactions.forEach((tx, idx) => {
    const bg = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
    doc.rect(40, currentY - 4, 515.28, 20).fill(bg);
    doc.fillColor('#1E293B').fontSize(9).font('Helvetica')
       .text(tx.customer_name, 50, currentY)
       .text(tx.customer_tier, 180, currentY)
       .text(tx.product_category, 260, currentY)
       .text(`$${tx.amount.toFixed(2)}`, 410, currentY)
       .text(tx.status.toUpperCase(), 480, currentY);

    currentY += 20;
  });
}

function drawTableHeaders(doc: PDFKit.PDFDocument, y: number, headers: string[]) {
  doc.rect(40, y - 4, 515.28, 22).fill('#0F172A');
  doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');

  const xPositions = [50, 180, 270, 380, 460, 520];
  headers.forEach((header, idx) => {
    const x = xPositions[idx] || (50 + idx * 90);
    doc.text(header, x, y + 2);
  });
}

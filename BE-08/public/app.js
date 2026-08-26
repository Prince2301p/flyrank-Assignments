document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const reportForm = document.getElementById('report-form');
  const btnGenerate = document.getElementById('btn-generate');
  const activeJobBadge = document.getElementById('active-job-badge');
  const jobProgressContainer = document.getElementById('job-progress-container');
  const jobEmptyState = document.getElementById('job-empty-state');
  const jobIdText = document.getElementById('job-id-text');
  const jobProgressPct = document.getElementById('job-progress-pct');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const jobStatusMsg = document.getElementById('job-status-msg');
  const jobDownloadArea = document.getElementById('job-download-area');
  const btnDownloadArtifact = document.getElementById('btn-download-artifact');
  const btnPreviewPdf = document.getElementById('btn-preview-pdf');

  const kpiRevenue = document.getElementById('kpi-revenue');
  const kpiTokens = document.getElementById('kpi-tokens');
  const kpiSla = document.getElementById('kpi-sla');
  const kpiOrders = document.getElementById('kpi-orders');

  const jobsTableBody = document.getElementById('jobs-table-body');
  const btnRefreshHistory = document.getElementById('btn-refresh-history');

  const schedulesList = document.getElementById('schedules-list');
  const btnOpenScheduleModal = document.getElementById('btn-open-schedule-modal');
  const scheduleModal = document.getElementById('schedule-modal');
  const btnCloseScheduleModal = document.getElementById('btn-close-schedule-modal');
  const scheduleForm = document.getElementById('schedule-form');

  const pdfModal = document.getElementById('pdf-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const pdfFrame = document.getElementById('pdf-frame');
  const modalTitle = document.getElementById('modal-title');

  let activeJobId = null;
  let activeJobPollTimer = null;
  let currentDownloadUrl = null;

  // Initialize
  fetchLivePreviewData();
  fetchJobsHistory();
  fetchSchedules();

  // 1. Submit Report Generation Job
  reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reportType = document.getElementById('report-type').value;
    const rangeDays = document.getElementById('range-days').value;

    btnGenerate.disabled = true;
    btnGenerate.classList.add('loading');

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, rangeDays: Number(rangeDays) })
      });

      const data = await res.json();
      if (res.ok && data.jobId) {
        startPollingJob(data.jobId);
      } else {
        alert(data.error || 'Failed to enqueue job');
      }
    } catch (err) {
      alert('Network error enqueuing report job');
    } finally {
      btnGenerate.disabled = false;
    }
  });

  // 2. Poll Active Job Status & Progress
  function startPollingJob(jobId) {
    activeJobId = jobId;
    if (activeJobPollTimer) clearInterval(activeJobPollTimer);

    jobEmptyState.classList.add('hidden');
    jobProgressContainer.classList.remove('hidden');
    jobDownloadArea.classList.add('hidden');

    activeJobBadge.className = 'badge-status badge-processing';
    activeJobBadge.textContent = 'Processing';

    jobIdText.textContent = jobId;
    jobProgressPct.textContent = '0%';
    progressBarFill.style.width = '0%';
    jobStatusMsg.textContent = 'Job enqueued. Waiting for background worker...';

    const poll = async () => {
      try {
        const res = await fetch(`/api/reports/jobs/${jobId}`);
        const job = await res.json();

        if (res.ok) {
          jobProgressPct.textContent = `${job.progress}%`;
          progressBarFill.style.width = `${job.progress}%`;

          if (job.progress < 40) {
            jobStatusMsg.textContent = 'Aggregating SQL metric data...';
          } else if (job.progress < 80) {
            jobStatusMsg.textContent = 'Rendering PDF vector graphics & tables...';
          } else if (job.progress < 100) {
            jobStatusMsg.textContent = 'Saving PDF artifact to disk...';
          }

          if (job.status === 'completed') {
            clearInterval(activeJobPollTimer);
            activeJobBadge.className = 'badge-status badge-completed';
            activeJobBadge.textContent = 'Completed';
            jobStatusMsg.textContent = `PDF Report ready! (${formatBytes(job.fileSizeBytes)}, ${job.pageCount} pages)`;
            
            currentDownloadUrl = job.resultUrl;
            btnDownloadArtifact.href = job.resultUrl;
            jobDownloadArea.classList.remove('hidden');

            fetchJobsHistory();
          } else if (job.status === 'failed') {
            clearInterval(activeJobPollTimer);
            activeJobBadge.className = 'badge-status badge-failed';
            activeJobBadge.textContent = 'Failed';
            jobStatusMsg.textContent = `Error: ${job.errorMessage || 'Job failed'}`;
            fetchJobsHistory();
          }
        }
      } catch (err) {
        console.error('Error polling job status:', err);
      }
    };

    poll();
    activeJobPollTimer = setInterval(poll, 600);
  }

  // 3. Fetch Live Preview Data
  async function fetchLivePreviewData() {
    try {
      const res = await fetch('/api/reports/preview-data?rangeDays=30');
      if (res.ok) {
        const data = await res.json();
        kpiRevenue.textContent = `$${data.financial.totalRevenue.toLocaleString()}`;
        kpiTokens.textContent = `${(data.ai.totalTokens / 1000000).toFixed(2)}M`;
        kpiSla.textContent = `${data.ai.slaComplianceRate}%`;
        kpiOrders.textContent = data.financial.totalTransactions.toLocaleString();
      }
    } catch (err) {
      console.error('Error fetching preview data:', err);
    }
  }

  // 4. Fetch Past Jobs History Table
  async function fetchJobsHistory() {
    try {
      const res = await fetch('/api/reports/jobs?limit=15');
      if (res.ok) {
        const { jobs } = await res.json();
        renderJobsTable(jobs);
      }
    } catch (err) {
      console.error('Error fetching jobs history:', err);
    }
  }

  function renderJobsTable(jobs) {
    if (!jobs || jobs.length === 0) {
      jobsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No reports generated yet.</td></tr>`;
      return;
    }

    jobsTableBody.innerHTML = jobs.map(j => {
      const badgeClass = j.status === 'completed' ? 'badge-completed' : j.status === 'processing' ? 'badge-processing' : 'badge-failed';
      const sizeText = j.file_size_bytes ? formatBytes(j.file_size_bytes) : '-';
      const pagesText = j.page_count ? `${j.page_count} p` : '-';
      const timeStr = new Date(j.created_at).toLocaleTimeString();

      let actionHtml = '-';
      if (j.status === 'completed' && j.result_url) {
        actionHtml = `
          <a href="${j.result_url}" target="_blank" class="btn btn-sm btn-outline" style="margin-right: 4px;">Download</a>
          <button class="btn btn-sm btn-secondary btn-preview-item" data-url="${j.result_url}" data-id="${j.id}">View</button>
        `;
      }

      return `
        <tr>
          <td class="mono">${j.id}</td>
          <td><span style="text-transform: capitalize;">${j.report_type}</span></td>
          <td><span class="badge-status ${badgeClass}">${j.status}</span></td>
          <td>${sizeText}</td>
          <td>${pagesText}</td>
          <td>${timeStr}</td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('');

    // Attach preview event listeners
    document.querySelectorAll('.btn-preview-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = e.target.getAttribute('data-url');
        const id = e.target.getAttribute('data-id');
        openPdfPreview(url, `PDF Report Preview (${id})`);
      });
    });
  }

  // 5. Fetch & Render Schedules (Stretch Feature)
  async function fetchSchedules() {
    try {
      const res = await fetch('/api/schedules');
      if (res.ok) {
        const { schedules } = await res.json();
        renderSchedules(schedules);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
  }

  function renderSchedules(schedules) {
    if (!schedules || schedules.length === 0) {
      schedulesList.innerHTML = `<div class="empty-state">No scheduled reports active.</div>`;
      return;
    }

    schedulesList.innerHTML = schedules.map(s => `
      <div class="schedule-item">
        <div class="schedule-info">
          <h4>${s.name}</h4>
          <p>Cron: <code class="mono">${s.cron_expression}</code> | Type: <strong>${s.report_type}</strong></p>
        </div>
        <div>
          <button class="btn btn-sm btn-outline btn-trigger-sched" data-id="${s.id}" title="Run now">▶ Run</button>
          <button class="btn btn-sm btn-secondary btn-delete-sched" data-id="${s.id}" title="Delete" style="color: var(--accent-rose);">&times;</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.btn-trigger-sched').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const res = await fetch(`/api/schedules/${id}/trigger`, { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.jobId) {
          startPollingJob(data.jobId);
        }
      });
    });

    document.querySelectorAll('.btn-delete-sched').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
        fetchSchedules();
      });
    });
  }

  // Modal Handlers
  btnPreviewPdf.addEventListener('click', () => {
    if (currentDownloadUrl) {
      openPdfPreview(currentDownloadUrl, `Active PDF Report Preview (${activeJobId})`);
    }
  });

  function openPdfPreview(url, title) {
    modalTitle.textContent = title;
    pdfFrame.src = url;
    pdfModal.classList.remove('hidden');
  }

  btnCloseModal.addEventListener('click', () => {
    pdfModal.classList.add('hidden');
    pdfFrame.src = '';
  });

  btnOpenScheduleModal.addEventListener('click', () => {
    scheduleModal.classList.remove('hidden');
  });

  btnCloseScheduleModal.addEventListener('click', () => {
    scheduleModal.classList.add('hidden');
  });

  scheduleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('sched-name').value;
    const cronExpression = document.getElementById('sched-cron').value;
    const reportType = document.getElementById('sched-type').value;

    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, cronExpression, reportType })
    });

    const data = await res.json();
    if (res.ok) {
      scheduleModal.classList.add('hidden');
      scheduleForm.reset();
      fetchSchedules();
    } else {
      alert(data.error || 'Failed to create schedule');
    }
  });

  btnRefreshHistory.addEventListener('click', () => {
    fetchJobsHistory();
    fetchLivePreviewData();
  });

  function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
});

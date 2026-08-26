// Application State
let currentFilter = 'all';
let pollInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  initFormListeners();
  startPolling();
});

function initFormListeners() {
  const form = document.getElementById('job-form');
  const useIdempotency = document.getElementById('useIdempotency');
  const idempotencyKey = document.getElementById('idempotencyKey');

  useIdempotency.addEventListener('change', () => {
    idempotencyKey.disabled = !useIdempotency.checked;
    if (useIdempotency.checked && !idempotencyKey.value) {
      generateRandomIdempotencyKey();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitJobFromForm();
  });
}

function generateRandomIdempotencyKey() {
  const key = `key-${Math.random().toString(36).substring(2, 9)}`;
  const input = document.getElementById('idempotencyKey');
  input.value = key;
  document.getElementById('useIdempotency').checked = true;
  input.disabled = false;
}

async function submitJobFromForm() {
  const taskType = document.getElementById('taskType').value;
  const prompt = document.getElementById('prompt').value;
  const processingTimeMs = parseInt(document.getElementById('processingTimeMs').value, 10);
  const maxRetries = parseInt(document.getElementById('maxRetries').value, 10);
  const simulateError = document.getElementById('simulateError').checked;
  const useIdempotency = document.getElementById('useIdempotency').checked;
  const idempotencyKey = useIdempotency ? document.getElementById('idempotencyKey').value : null;

  const payload = {
    taskType,
    prompt,
    processingTimeMs,
    maxRetries,
    simulateError,
    idempotencyKey
  };

  await dispatchJob(payload);
}

async function dispatchJob(payload) {
  const startTime = performance.now();
  const btn = document.getElementById('btn-submit');
  btn.disabled = true;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (payload.idempotencyKey) {
      headers['Idempotency-Key'] = payload.idempotencyKey;
    }

    const res = await fetch('/api/v1/jobs/ai-generate', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const latencyMs = Math.round(performance.now() - startTime);
    const data = await res.json();

    displayResponseInspector(res.status, latencyMs, data);
    fetchJobsAndAlerts(); // Immediate update

  } catch (err) {
    alert(`Failed to dispatch job: ${err.message}`);
  } finally {
    btn.disabled = false;
  }
}

function displayResponseInspector(statusCode, latencyMs, data) {
  const inspector = document.getElementById('response-inspector');
  inspector.style.display = 'flex';

  document.getElementById('resp-status-badge').innerText = `${statusCode} ACCEPTED`;
  document.getElementById('resp-status-code').innerText = `${statusCode} Accepted`;
  document.getElementById('resp-latency').innerText = `${latencyMs}ms`;
  document.getElementById('resp-job-id').innerText = data.jobId || 'N/A';
  
  const linkEl = document.getElementById('resp-status-link');
  linkEl.href = data.statusUrl || '#';
  linkEl.innerText = data.statusUrl || 'N/A';

  document.getElementById('resp-json').innerText = JSON.stringify(data, null, 2);
}

function startPolling() {
  fetchJobsAndAlerts();
  pollInterval = setInterval(fetchJobsAndAlerts, 1000);
}

async function fetchJobsAndAlerts() {
  try {
    const [jobsRes, alertsRes] = await Promise.all([
      fetch('/api/v1/jobs'),
      fetch('/api/v1/jobs/system/alerts')
    ]);

    if (jobsRes.ok) {
      const jobsData = await jobsRes.json();
      updateMetrics(jobsData.metrics);
      renderJobsList(jobsData.jobs);
    }

    if (alertsRes.ok) {
      const alertsData = await alertsRes.json();
      renderAlertsList(alertsData.alerts);
    }

  } catch (err) {
    console.error('Error polling status:', err);
  }
}

function updateMetrics(metrics) {
  if (!metrics) return;
  document.getElementById('metric-queued').innerText = metrics.queued || 0;
  document.getElementById('metric-processing').innerText = metrics.processing || 0;
  document.getElementById('metric-completed').innerText = metrics.completed || 0;
  document.getElementById('metric-dlq').innerText = metrics.dlq || 0;
}

function filterJobs(status) {
  currentFilter = status;
  document.querySelectorAll('.filter-tabs .tab').forEach(tab => {
    tab.classList.toggle('active', tab.innerText.toLowerCase() === status);
  });
  fetchJobsAndAlerts();
}

function renderJobsList(jobs) {
  const container = document.getElementById('jobs-container');
  
  let filtered = jobs;
  if (currentFilter !== 'all') {
    filtered = jobs.filter(j => j.status === currentFilter);
  }

  if (!filtered || filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">No jobs matching "${currentFilter}" state.</div>`;
    return;
  }

  container.innerHTML = filtered.map(job => {
    const isError = job.status === 'dlq' || job.status === 'failed';
    const isProcessing = job.status === 'processing';
    
    let badgeClass = `badge-${job.status}`;
    let badgeText = job.status.toUpperCase();
    if (job.status === 'dlq') badgeText = 'DLQ (FAILED)';

    return `
      <div class="job-card" id="card-${job.id}">
        <div class="job-header">
          <div>
            <span class="job-id code-font">${job.id}</span>
            ${job.idempotencyKey ? `<span class="help-text code-font">🔑 ${job.idempotencyKey}</span>` : ''}
          </div>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>

        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${isError ? 'warning' : ''}" style="width: ${job.progress}%"></div>
        </div>

        <div class="job-status-msg">
          <span>${job.progressMessage || 'In queue...'}</span>
        </div>

        <div class="job-header" style="font-size: 0.78rem; color: var(--text-dim);">
          <span>Attempt: ${job.attempts}/${job.maxRetries}</span>
          <span>Created: ${new Date(job.createdAt).toLocaleTimeString()}</span>
        </div>

        ${job.result ? `
          <details class="job-details-expand">
            <summary style="cursor:pointer; font-weight:600; color:var(--success);">✅ View Result Output</summary>
            <pre class="code-font" style="margin-top:6px; overflow-x:auto;">${JSON.stringify(job.result.result, null, 2)}</pre>
          </details>
        ` : ''}

        ${job.error ? `
          <div class="alert-item warning" style="margin-top:4px;">
            <strong>Failure Cause:</strong> ${job.error}
          </div>
        ` : ''}

        ${job.status === 'dlq' ? `
          <button class="btn btn-sm btn-secondary" onclick="retryDlqJob('${job.id}')" style="margin-top:6px;">
            🔄 Manually Retry Job
          </button>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderAlertsList(alerts) {
  const container = document.getElementById('alerts-container');
  if (!alerts || alerts.length === 0) {
    container.innerHTML = `<div class="empty-state">No DLQ or failure alerts logged.</div>`;
    return;
  }

  container.innerHTML = alerts.map(a => `
    <div class="alert-item ${a.type === 'JOB_RETRY' ? 'warning' : ''}">
      <div class="alert-meta">
        <strong>[${a.type}] Severity: ${a.severity}</strong>
        <span>${new Date(a.timestamp).toLocaleTimeString()}</span>
      </div>
      <div>${a.message}</div>
    </div>
  `).join('');
}

async function retryDlqJob(jobId) {
  try {
    const res = await fetch(`/api/v1/jobs/${jobId}/retry`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      alert(`Job ${jobId} re-enqueued successfully!`);
      fetchJobsAndAlerts();
    } else {
      alert(`Retry failed: ${data.message}`);
    }
  } catch (err) {
    alert(`Error retrying job: ${err.message}`);
  }
}

async function clearAlerts() {
  await fetch('/api/v1/jobs/system/alerts', { method: 'DELETE' });
  fetchJobsAndAlerts();
}

// Preset Verification Scenarios
async function runPresetScenario(type) {
  switch (type) {
    case 'fast':
      await dispatchJob({
        taskType: 'summarize',
        prompt: 'Verify instant HTTP 202 Accepted response and async status polling.',
        processingTimeMs: 3000,
        maxRetries: 3,
        simulateError: false
      });
      break;

    case 'idempotency':
      const fixedKey = `key-demo-idempotency-${Math.floor(Math.random() * 900) + 100}`;
      alert(`Dispatching Job 1 with Idempotency-Key: "${fixedKey}"`);
      await dispatchJob({
        taskType: 'code-review',
        prompt: 'Check code quality for queue architecture.',
        processingTimeMs: 4000,
        maxRetries: 3,
        idempotencyKey: fixedKey
      });

      setTimeout(async () => {
        alert(`Dispatching Job 2 with EXACT SAME Idempotency-Key: "${fixedKey}". Server should return 202 with isDuplicate: true and matching Job ID!`);
        await dispatchJob({
          taskType: 'code-review',
          prompt: 'Check code quality for queue architecture.',
          processingTimeMs: 4000,
          maxRetries: 3,
          idempotencyKey: fixedKey
        });
      }, 1200);
      break;

    case 'retry':
      await dispatchJob({
        taskType: 'generate',
        prompt: 'Test exponential backoff retries on upstream AI rate limit.',
        processingTimeMs: 2000,
        maxRetries: 3,
        simulateError: true
      });
      break;

    case 'dlq':
      await dispatchJob({
        taskType: 'sentiment',
        prompt: 'Exhaust all retries and trigger Dead Letter Queue alert.',
        processingTimeMs: 1500,
        maxRetries: 1,
        simulateError: true
      });
      break;
  }
}

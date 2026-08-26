const assert = require('assert');
const http = require('http');
const app = require('../src/server');

let server;
let baseUrl;

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    let payload = null;
    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('\n==================================================');
  console.log('🧪 Running BE-06 Background Job System Test Suite');
  console.log('==================================================\n');

  try {
    // 1. Instant 202 Accepted Response
    console.log('Test 1: Verify POST /api/v1/jobs/ai-generate returns HTTP 202 Accepted immediately...');
    const startTime = Date.now();
    const res1 = await makeRequest('/api/v1/jobs/ai-generate', 'POST', {
      taskType: 'summarize',
      prompt: 'Testing instant 202 response performance',
      processingTimeMs: 1500
    });

    const duration = Date.now() - startTime;
    assert.strictEqual(res1.status, 202, `Expected status 202 but got ${res1.status}`);
    assert.ok(res1.body.jobId, 'Expected jobId in response');
    assert.strictEqual(res1.body.status, 'accepted');
    assert.ok(duration < 200, `Expected response time < 200ms, actual: ${duration}ms`);
    console.log(`  ✅ HTTP 202 Accepted verified! Response latency: ${duration}ms, Job ID: ${res1.body.jobId}`);

    const jobId1 = res1.body.jobId;

    // 2. Poll Status Endpoint until completed
    console.log('\nTest 2: Poll GET /api/v1/jobs/:id until completion...');
    let completed = false;
    let attempts = 0;
    let jobDetails;

    while (!completed && attempts < 15) {
      await sleep(300);
      attempts++;
      const resStatus = await makeRequest(`/api/v1/jobs/${jobId1}`);
      assert.strictEqual(resStatus.status, 200);
      jobDetails = resStatus.body;

      if (jobDetails.status === 'completed') {
        completed = true;
      }
    }

    assert.strictEqual(jobDetails.status, 'completed', 'Job should reach completed status');
    assert.strictEqual(jobDetails.progress, 100);
    assert.ok(jobDetails.result && jobDetails.result.result, 'Job result payload should be populated');
    console.log(`  ✅ Status endpoint polling verified! Completed after ${attempts} polls. Result summary: "${jobDetails.result.result.summary.substring(0, 60)}..."`);

    // 3. Idempotency Guarantee
    console.log('\nTest 3: Verify Idempotency-Key deduplication...');
    const idempotencyKey = `test-key-${Date.now()}`;

    const resIdem1 = await makeRequest('/api/v1/jobs/ai-generate', 'POST', {
      taskType: 'generate',
      prompt: 'First dispatch with idempotency key',
      processingTimeMs: 2000
    }, { 'Idempotency-Key': idempotencyKey });

    assert.strictEqual(resIdem1.status, 202);
    assert.strictEqual(resIdem1.body.isDuplicate, false);
    const initialJobId = resIdem1.body.jobId;

    // Dispatch second job with identical idempotency key
    const resIdem2 = await makeRequest('/api/v1/jobs/ai-generate', 'POST', {
      taskType: 'generate',
      prompt: 'Second dispatch with identical idempotency key',
      processingTimeMs: 2000
    }, { 'Idempotency-Key': idempotencyKey });

    assert.strictEqual(resIdem2.status, 202);
    assert.strictEqual(resIdem2.body.isDuplicate, true, 'Second request must be marked as duplicate');
    assert.strictEqual(resIdem2.body.jobId, initialJobId, 'Duplicate request must return matching jobId');
    console.log(`  ✅ Idempotency verified! Second request returned duplicate=true and matching Job ID: ${initialJobId}`);

    // 4. Retry Mechanism & Backoff
    console.log('\nTest 4: Verify automatic exponential retries on error...');
    const resRetry = await makeRequest('/api/v1/jobs/ai-generate', 'POST', {
      taskType: 'generate',
      prompt: 'Testing automatic retry on simulated error',
      simulateError: true,
      processingTimeMs: 400,
      maxRetries: 3
    });

    assert.strictEqual(resRetry.status, 202);
    const retryJobId = resRetry.body.jobId;

    // Wait for at least 1 retry attempt
    await sleep(1000);
    const resRetryStatus = await makeRequest(`/api/v1/jobs/${retryJobId}`);
    assert.ok(resRetryStatus.body.attempts >= 1, 'Job should have registered attempts');
    assert.ok(resRetryStatus.body.errorHistory.length >= 1, 'Error history should record failure attempts');
    console.log(`  ✅ Retry mechanism verified! Attempts recorded: ${resRetryStatus.body.attempts}/${resRetryStatus.body.maxRetries}, Errors logged: ${resRetryStatus.body.errorHistory.length}`);

    // 5. Dead-Letter Queue (DLQ) & Alerting
    console.log('\nTest 5: Verify Dead Letter Queue (DLQ) and alert dispatch after exhausting retries...');
    const resDlq = await makeRequest('/api/v1/jobs/ai-generate', 'POST', {
      taskType: 'generate',
      prompt: 'Testing DLQ transition',
      simulateError: true,
      processingTimeMs: 200,
      maxRetries: 1 // Single attempt so it immediately goes to DLQ
    });

    const dlqJobId = resDlq.body.jobId;
    await sleep(600); // Allow worker to attempt and fail

    const resDlqStatus = await makeRequest(`/api/v1/jobs/${dlqJobId}`);
    assert.strictEqual(resDlqStatus.body.status, 'dlq', 'Job must transition to dlq status after max retries');

    // Check system alerts
    const resAlerts = await makeRequest('/api/v1/jobs/system/alerts');
    assert.ok(resAlerts.body.alerts.length > 0, 'Alerts should contain DLQ event');
    const dlqAlert = resAlerts.body.alerts.find(a => a.type === 'DLQ_JOB' && a.metadata.jobId === dlqJobId);
    assert.ok(dlqAlert, 'DLQ alert record must exist for failed job');
    console.log(`  ✅ DLQ & Alerting verified! Job ${dlqJobId} moved to DLQ. Alert message: "${dlqAlert.message}"`);

    // 6. Manual DLQ Retry
    console.log('\nTest 6: Verify manual retry of DLQ job...');
    const resManualRetry = await makeRequest(`/api/v1/jobs/${dlqJobId}/retry`, 'POST');
    assert.strictEqual(resManualRetry.status, 200);
    assert.strictEqual(resManualRetry.body.job.status, 'queued');
    console.log(`  ✅ Manual DLQ retry verified! Job ${dlqJobId} successfully re-enqueued.`);

    console.log('\n==================================================');
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! (6/6)');
    console.log('==================================================\n');

  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

// Start server on random port for testing
server = app.listen(0, () => {
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  runTests();
});

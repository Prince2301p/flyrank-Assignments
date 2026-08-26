import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { MockProvider } from '../src/providers/mockProvider.js';
import { LLMService } from '../src/services/llmService.js';
import { TriageResponseSchema } from '../src/schemas/ticket.js';

describe('BE-07: AI Model Judgement API Endpoint (/api/v1/triage)', () => {
  let mockProvider: MockProvider;
  let app: ReturnType<typeof createApp>['app'];

  beforeEach(() => {
    mockProvider = new MockProvider();
    app = createApp(mockProvider, 500, 2).app;
  });

  // Test Case 1: Standard valid ticket triage returns schema-compliant response
  it('Test Case 1: Standard Billing Ticket Triage -> Returns Valid Structured Output', async () => {
    const res = await request(app)
      .post('/api/v1/triage')
      .send({
        ticket_id: 'TC-101',
        customer_name: 'Alice Smith',
        message: 'I was double charged on my invoice #1042 last month. Please refund the extra $50.',
        metadata: { source: 'email', customer_tier: 'pro' },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.category).toBe('billing');
    expect(res.body.data.suggested_team).toBe('billing_dept');
    expect(res.body.data.action_required).toBe(true);

    // Validate runtime schema compliance
    const parseCheck = TriageResponseSchema.safeParse(res.body.data);
    expect(parseCheck.success).toBe(true);
  });

  // Test Case 2: Noisy / informal text with typos is accurately processed
  it('Test Case 2: Noisy Technical Bug Text -> Correctly Classified into Structured Schema', async () => {
    const res = await request(app)
      .post('/api/v1/triage')
      .send({
        message: 'yo app crashed again status 500 error wtf fix this asap plzzzz',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.category).toBe('bug_report');
    expect(res.body.data.suggested_team).toBe('engineering');
    expect(res.body.data.summary).toBeDefined();
    expect(typeof res.body.data.summary).toBe('string');
  });

  // Test Case 3: High urgency & critical escalation detection
  it('Test Case 3: Critical Outage / Security Message -> Flags Critical Urgency & Security Team', async () => {
    const res = await request(app)
      .post('/api/v1/triage')
      .send({
        message: 'URGENT SECURITY BREACH! Database down and credentials leaked immediately call emergency support!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.urgency).toBe('critical');
    expect(res.body.data.suggested_team).toBe('security');
    expect(res.body.data.action_required).toBe(true);
  });

  // Test Case 4: Ambiguous query structured gracefully with confidence score
  it('Test Case 4: Ambiguous Inquiry -> Returns Valid Schema with Confidence Metrics', async () => {
    const res = await request(app)
      .post('/api/v1/triage')
      .send({
        message: 'Just checking in regarding general updates and documentation.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.confidence_score).toBeGreaterThanOrEqual(0);
    expect(res.body.data.confidence_score).toBeLessThanOrEqual(1);
    expect(['low', 'medium', 'high', 'critical']).toContain(res.body.data.urgency);
  });

  // Test Case 5: Rejection of schema mismatch & automatic retry recovery
  it('Test Case 5: Schema Validation -> Rejects Malformed Output and Recovers via Retry', async () => {
    // Fail 1st attempt with invalid JSON schema format, succeed on 2nd attempt
    mockProvider.setSimulatedBehavior({
      failAttemptsCount: 1,
      errorType: 'INVALID_JSON',
    });

    const llmService = new LLMService({
      customProvider: mockProvider,
      maxRetries: 2,
      initialDelayMs: 10,
    });

    const prompt = 'Please classify this account lockout request: User cannot log in after password reset.';
    const result = await llmService.executeJudgement(prompt, TriageResponseSchema);

    expect(result.data.category).toBe('account_access');
    expect(result.metadata.attempts).toBe(2); // Proves it retried after schema failure
  });

  // Test Case 6: Real request timeout enforcing cancellation
  it('Test Case 6: Timeout Abort -> Aborts Slow LLM Call and Returns HTTP 504', async () => {
    const slowProvider = new MockProvider({
      failAttemptsCount: 1,
      errorType: 'TIMEOUT',
      delayMs: 2000,
    });

    // Create app with a tight timeout of 100ms
    const slowApp = createApp(slowProvider, 100, 0).app;

    const res = await request(slowApp)
      .post('/api/v1/triage')
      .send({
        message: 'Slow response test message',
      });

    expect(res.status).toBe(504);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('timed out');
  });

  // Test Case 7: Smart Retries on Transient Errors (Rate Limit 429)
  it('Test Case 7: Transient Rate Limit 429 -> Executes Backoff Retry and Succeeds', async () => {
    mockProvider.setSimulatedBehavior({
      failAttemptsCount: 1,
      errorType: '429',
    });

    const res = await request(app)
      .post('/api/v1/triage')
      .send({
        message: 'System bug report after rate limit',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta.attempts).toBe(2); // Proves retry succeeded after 429
  });

  // Test Case 8: Non-Retryable Error Fast-Fail (401 Invalid Auth Key)
  it('Test Case 8: Non-Retryable 401 Error -> Fails Immediately Without Wasting Retries', async () => {
    mockProvider.setSimulatedBehavior({
      failAttemptsCount: 5,
      errorType: '401',
    });

    const llmService = new LLMService({
      customProvider: mockProvider,
      maxRetries: 3,
      initialDelayMs: 10,
    });

    try {
      await llmService.executeJudgement('Test unauthorized prompt', TriageResponseSchema);
      expect.fail('Should have thrown an error');
    } catch (err: any) {
      expect(err.attempts).toBe(1); // Fast-fails on 1st attempt, zero extra retries
      expect(err.message).toContain('Unauthorized');
    }
  });
});

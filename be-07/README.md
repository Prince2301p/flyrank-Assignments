# BE-07: Connect to an AI API — Trustworthy LLM Judgement Endpoint

A production-ready Node.js & TypeScript API endpoint that connects to AI model providers (Google Gemini, Groq, or Mock) to perform structured **Support Ticket Triage & Information Extraction**. 

Unlike naive LLM wrappers or free-form chatbots, this API is designed for **maximum system trust**:
- 🛡️ **Schema-Enforced Outputs**: All responses are strictly validated at runtime against Zod schemas.
- ⏱️ **Real Timeout Controls**: AbortController-driven timeouts guarantee requests never hang indefinitely.
- 🔄 **Smart Exponential Backoff Retries**: Intelligently retries transient errors (HTTP 429, 5xx server errors, network timeouts, schema mismatches) while fast-failing non-retryable errors (401 invalid API key, 400 bad payload).
- 🆓 **Zero-Credit-Card Free Providers**: Native support for **Google Gemini** (`gemini-2.5-flash`) and **Groq** (`llama-3.3-70b-versatile`), alongside a deterministic **Mock Provider** for offline test environments.
- 🧪 **8 Automated Test Cases**: Full test suite covering happy paths, noisy text, critical incidents, schema validation, timeout aborts, transient rate-limits, and fast-path error handling.

---

## 🚀 Quick Start

### 1. Installation

```bash
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

To run with real free AI models, add your free API key:
- **Google Gemini**: Get free key at [Google AI Studio](https://aistudio.google.com/) (`GEMINI_API_KEY`)
- **Groq**: Get free key at [Groq Console](https://console.groq.com/) (`GROQ_API_KEY`)

*Note: If no API key is set, the API defaults to the built-in offline `MockProvider` so you can test everything immediately without credentials.*

### 3. Run Development Server

```bash
npm run dev
```

Server listens on `http://localhost:3000`.

---

## 📡 API Reference

### Health Check
`GET /health`

**Response:**
```json
{
  "status": "ok",
  "service": "ai-judgement-api",
  "timestamp": "2026-08-26T20:25:00.000Z"
}
```

### AI Ticket Triage & Judgment Endpoint
`POST /api/v1/triage`

**Request Body (`application/json`):**
```json
{
  "ticket_id": "TICK-9042",
  "customer_name": "Sarah Connor",
  "message": "I was double charged on invoice #1042 last month. Please process a refund of $50.",
  "metadata": {
    "source": "email",
    "customer_tier": "pro"
  }
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "category": "billing",
    "urgency": "medium",
    "sentiment": "neutral",
    "action_required": true,
    "summary": "Customer requesting a refund for a double charge on invoice #1042.",
    "suggested_team": "billing_dept",
    "confidence_score": 0.95,
    "key_entities": [
      "billing",
      "invoice"
    ]
  },
  "meta": {
    "provider": "mock",
    "attempts": 1,
    "executionTimeMs": 42,
    "retriesExhausted": false
  }
}
```

---

## 🛡️ Reliability Architecture

### 1. Schema Validation (Zod)
Every judgment response must satisfy the strict Zod schema:
```ts
export const TriageResponseSchema = z.object({
  category: z.enum(['billing', 'bug_report', 'feature_request', 'account_access', 'general_inquiry']),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'frustrated']),
  action_required: z.boolean(),
  summary: z.string().min(5),
  suggested_team: z.enum(['engineering', 'billing_dept', 'customer_support', 'security']),
  confidence_score: z.number().min(0).max(1),
  key_entities: z.array(z.string()).default([]),
});
```

### 2. Timeouts & Retries
- **Hard Timeout**: `AbortController` aborts model calls exceeding `REQUEST_TIMEOUT_MS` (default 10,000ms), returning HTTP 504.
- **Smart Retries**: Exponential backoff with jitter (`delay = initialDelay * 2^(attempt-1) + jitter`).
- **Retry Filtering**:
  - **Retryable**: HTTP 429 (Rate Limit), 5xx (Server Errors), Network Timeouts, JSON parse errors, Zod schema validation errors.
  - **Non-retryable**: HTTP 401 (Unauthorized API Key), 403 (Forbidden), 400 (Invalid Client Request).

---

## 🧪 Test Suite (8 Test Cases)

Run full test suite:
```bash
npm test
```

### Test Coverage:
1. **Test Case 1**: Standard billing ticket -> Valid schema output.
2. **Test Case 2**: Noisy / informal text with typos (`"yo app crashed status 500 error fix asap"`) -> Correctly classified bug report.
3. **Test Case 3**: Critical security message -> Flags `critical` urgency & `security` team.
4. **Test Case 4**: Ambiguous query -> Valid fallback structure with confidence metrics.
5. **Test Case 5**: Schema validation mismatch -> Rejects malformed output and recovers via retry.
6. **Test Case 6**: Real request timeout -> Aborts hanging call and returns HTTP 504.
7. **Test Case 7**: Transient 429 Rate Limit -> Executes backoff retry and succeeds on subsequent try.
8. **Test Case 8**: Non-retryable 401 error -> Fast-fails immediately without wasting retries.

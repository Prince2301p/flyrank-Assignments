/**
 * AI Service Module
 * Simulates a long-running AI model invocation (e.g. summarization, code generation, sentiment analysis)
 * supports configurable delay, progress callbacks, and failure injection for testing retries.
 */

class AIService {
  /**
   * Execute an AI operation
   * @param {Object} params
   * @param {string} params.taskType - 'summarize' | 'code-review' | 'sentiment' | 'generate'
   * @param {string} params.prompt - Input prompt / content
   * @param {boolean} params.simulateError - Force job failure to test retries & DLQ
   * @param {number} params.processingTimeMs - Artificial delay in ms (default 3000ms)
   * @param {Function} onProgress - Progress reporting callback (progressPercentage, detailMessage)
   */
  async processAIJob({ taskType = 'generate', prompt, simulateError = false, processingTimeMs = 3000 }, onProgress = () => {}) {
    const startTime = Date.now();
    const steps = [
      { pct: 15, msg: 'Initializing neural model context & parsing prompt tokens...' },
      { pct: 40, msg: 'Generating embedding vectors and computing attention maps...' },
      { pct: 70, msg: 'Synthesizing response stream & verifying output constraints...' },
      { pct: 90, msg: 'Finalizing response payload & calculating latency metrics...' }
    ];

    const stepInterval = Math.floor(processingTimeMs / steps.length);

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, stepInterval));
      
      // Check if we should fail at step 2 if simulateError is requested
      if (simulateError && i === 2) {
        throw new Error(`[Simulated AI API Error 503] Upstream AI inference engine overloaded / rate limit exceeded.`);
      }

      onProgress(steps[i].pct, steps[i].msg);
    }

    // Final finish delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    const totalDuration = Date.now() - startTime;

    // Generate output based on taskType
    let resultPayload = {};
    switch (taskType) {
      case 'summarize':
        resultPayload = {
          summary: `Summary of prompt (${prompt.length} chars): The input highlights key technical requirements for building scalable background workers with idempotency, exponential backoff, and DLQ handling.`,
          keyTakeaways: [
            'HTTP 202 Accepted allows instant caller unblocking.',
            'Idempotency keys prevent duplicate processing on retries.',
            'Exponential backoff prevents cascading service failures.',
            'DLQ and alert integration provide failure observability.'
          ],
          confidenceScore: 0.98
        };
        break;
      
      case 'code-review':
        resultPayload = {
          review: 'Code structure is cleanly decoupled with separate Express routes, Queue service, and AI worker layer.',
          rating: 'A+',
          suggestions: [
            'Ensure persistent storage is used for durable queues across restarts.',
            'Verify idempotency key headers are present on client retries.'
          ]
        };
        break;

      case 'sentiment':
        resultPayload = {
          sentiment: 'positive',
          score: 0.94,
          detectedEmotion: 'enthusiastic'
        };
        break;

      case 'generate':
      default:
        resultPayload = {
          generatedText: `[AI Generated Response] Processed prompt: "${prompt}". Background worker successfully executed task out-of-band in ${totalDuration}ms without blocking the client HTTP connection!`,
          tokensUsed: Math.floor(Math.random() * 150) + 120,
          modelName: 'Antigravity-v2-AI-Engine'
        };
        break;
    }

    return {
      success: true,
      taskType,
      prompt,
      result: resultPayload,
      executionTimeMs: totalDuration,
      completedAt: new Date().toISOString()
    };
  }
}

module.exports = new AIService();

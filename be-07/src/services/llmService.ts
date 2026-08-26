import { ZodSchema } from 'zod';
import { ILLMProvider, LLMProviderError } from '../providers/types.js';
import { GeminiProvider } from '../providers/geminiProvider.js';
import { GroqProvider } from '../providers/groqProvider.js';
import { MockProvider } from '../providers/mockProvider.js';

export interface LLMServiceOptions {
  providerName?: 'gemini' | 'groq' | 'mock';
  timeoutMs?: number;
  maxRetries?: number;
  initialDelayMs?: number;
  customProvider?: ILLMProvider;
}

export interface ExecutionMetadata {
  provider: string;
  attempts: number;
  executionTimeMs: number;
  retriesExhausted: boolean;
}

export class LLMService {
  private provider: ILLMProvider;
  private timeoutMs: number;
  private maxRetries: number;
  private initialDelayMs: number;

  constructor(options: LLMServiceOptions = {}) {
    const providerName =
      options.providerName ||
      (process.env.LLM_PROVIDER as 'gemini' | 'groq' | 'mock') ||
      'mock';

    if (options.customProvider) {
      this.provider = options.customProvider;
    } else if (providerName === 'gemini') {
      this.provider = new GeminiProvider();
    } else if (providerName === 'groq') {
      this.provider = new GroqProvider();
    } else {
      this.provider = new MockProvider();
    }

    this.timeoutMs =
      options.timeoutMs ??
      (process.env.REQUEST_TIMEOUT_MS
        ? parseInt(process.env.REQUEST_TIMEOUT_MS, 10)
        : 10000);

    this.maxRetries =
      options.maxRetries ??
      (process.env.MAX_RETRIES ? parseInt(process.env.MAX_RETRIES, 10) : 3);

    this.initialDelayMs = options.initialDelayMs ?? 500;
  }

  public setProvider(provider: ILLMProvider) {
    this.provider = provider;
  }

  /**
   * Executes a structured model judgment call with timeouts, retries, and schema verification.
   */
  async executeJudgement<T>(
    prompt: string,
    schema: ZodSchema<T>,
    systemPrompt?: string
  ): Promise<{ data: T; metadata: ExecutionMetadata }> {
    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.maxRetries) {
      attempt++;

      // Create an AbortController for enforcing strict timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(
          new DOMException(
            `LLM request timed out after ${this.timeoutMs}ms`,
            'AbortError'
          )
        );
      }, this.timeoutMs);

      try {
        const rawData = await this.provider.generateStructuredOutput(
          prompt,
          schema,
          {
            signal: controller.signal,
            systemPrompt,
          }
        );

        // Validate data against schema strictly in LLMService
        const parseResult = schema.safeParse(rawData);
        if (!parseResult.success) {
          throw new LLMProviderError(
            `LLM Output Schema Validation Error: ${parseResult.error.message}`,
            true,
            422
          );
        }

        const data = parseResult.data;

        clearTimeout(timeoutId);

        return {
          data,
          metadata: {
            provider: this.provider.name,
            attempts: attempt,
            executionTimeMs: Date.now() - startTime,
            retriesExhausted: false,
          },
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        const isTimeout =
          err.name === 'AbortError' ||
          err.message?.includes('timed out') ||
          err.message?.includes('aborted');

        // Determine retryability
        let isRetryable = true;
        if (err instanceof LLMProviderError) {
          isRetryable = err.isRetryable;
        } else if (err.status === 401 || err.status === 403 || err.status === 400) {
          isRetryable = false;
        }

        // Fast-fail if not retryable or if we reached max retries
        if (!isRetryable || attempt > this.maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const backoffDelay =
          this.initialDelayMs * Math.pow(2, attempt - 1) + Math.random() * 50;

        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }

    const executionTimeMs = Date.now() - startTime;
    const finalErrorMessage = isTimeoutError(lastError)
      ? `LLM Request timed out after ${this.timeoutMs}ms (Attempts: ${attempt})`
      : lastError?.message || 'LLM execution failed';

    const failureError = new Error(
      `Trustworthy LLM Call Failed: ${finalErrorMessage}`
    );
    (failureError as any).attempts = attempt;
    (failureError as any).executionTimeMs = executionTimeMs;
    (failureError as any).originalError = lastError;

    throw failureError;
  }
}

function isTimeoutError(err: any): boolean {
  return (
    err?.name === 'AbortError' ||
    err?.message?.toLowerCase().includes('timed out') ||
    err?.message?.toLowerCase().includes('aborted')
  );
}

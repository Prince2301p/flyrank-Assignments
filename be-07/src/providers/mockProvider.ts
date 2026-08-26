import { ZodSchema } from 'zod';
import { ILLMProvider, ProviderGenerateOptions, LLMProviderError } from './types.js';
import { TriageResponse } from '../schemas/ticket.js';

export class MockProvider implements ILLMProvider {
  public readonly name = 'mock';
  private simulatedBehavior?: {
    failAttemptsCount?: number;
    errorType?: '429' | '500' | '401' | 'INVALID_JSON' | 'TIMEOUT';
    delayMs?: number;
  };
  private attemptTracker: Map<string, number> = new Map();

  constructor(simulatedBehavior?: MockProvider['simulatedBehavior']) {
    this.simulatedBehavior = simulatedBehavior;
  }

  public setSimulatedBehavior(behavior?: MockProvider['simulatedBehavior']) {
    this.simulatedBehavior = behavior;
  }

  async generateStructuredOutput<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: ProviderGenerateOptions
  ): Promise<T> {
    const key = prompt.slice(0, 30);
    const attempts = (this.attemptTracker.get(key) || 0) + 1;
    this.attemptTracker.set(key, attempts);

    if (this.simulatedBehavior) {
      const maxFail = this.simulatedBehavior.failAttemptsCount ?? Infinity;

      if (attempts <= maxFail && this.simulatedBehavior.errorType) {
        const errType = this.simulatedBehavior.errorType;

        if (errType === 'TIMEOUT') {
          const timeoutDelay = options?.signal ? 15000 : (this.simulatedBehavior.delayMs ?? 1000);
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, timeoutDelay);
            if (options?.signal) {
              options.signal.addEventListener('abort', () => {
                clearTimeout(timer);
                reject(new DOMException('The operation was aborted due to timeout', 'AbortError'));
              });
            }
          });
        }

        if (errType === '429') {
          throw new LLMProviderError('Rate limit exceeded (429 Too Many Requests)', true, 429);
        }

        if (errType === '500') {
          throw new LLMProviderError('Internal Server Error (500)', true, 500);
        }

        if (errType === '401') {
          throw new LLMProviderError('Unauthorized: Invalid API Key (401)', false, 401);
        }

        if (errType === 'INVALID_JSON') {
          // Returns raw invalid payload that breaks Zod schema validation
          return { category: 'UNKNOWN_CATEGORY', urgency: 'SUPER_URGENT' } as unknown as T;
        }
      }
    }

    if (this.simulatedBehavior?.delayMs) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, this.simulatedBehavior!.delayMs);
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('The operation was aborted due to timeout', 'AbortError'));
          });
        }
      });
    }

    if (options?.signal?.aborted) {
      throw new DOMException('The operation was aborted', 'AbortError');
    }

    // Heuristic deterministic response generator for realistic triage
    const lowerPrompt = prompt.toLowerCase();

    let category: TriageResponse['category'] = 'general_inquiry';
    let urgency: TriageResponse['urgency'] = 'medium';
    let sentiment: TriageResponse['sentiment'] = 'neutral';
    let action_required = true;
    let suggested_team: TriageResponse['suggested_team'] = 'customer_support';
    let summary = 'Customer reached out with a general request.';
    let key_entities: string[] = [];

    if (lowerPrompt.includes('charge') || lowerPrompt.includes('refund') || lowerPrompt.includes('billing') || lowerPrompt.includes('invoice') || lowerPrompt.includes('subscription')) {
      category = 'billing';
      suggested_team = 'billing_dept';
      summary = 'Customer is requesting assistance regarding billing, charges, or subscriptions.';
      key_entities.push('billing', 'invoice');
    } else if (lowerPrompt.includes('crash') || lowerPrompt.includes('error') || lowerPrompt.includes('bug') || lowerPrompt.includes('failed') || lowerPrompt.includes('500')) {
      category = 'bug_report';
      suggested_team = 'engineering';
      summary = 'Customer reported a technical error or bug in the system.';
      key_entities.push('system_bug');
    } else if (lowerPrompt.includes('password') || lowerPrompt.includes('login') || lowerPrompt.includes('lockout') || lowerPrompt.includes('2fa') || lowerPrompt.includes('account')) {
      category = 'account_access';
      suggested_team = 'customer_support';
      summary = 'Customer is experiencing account authentication or access lockout issues.';
      key_entities.push('account_access');
    } else if (lowerPrompt.includes('feature') || lowerPrompt.includes('add') || lowerPrompt.includes('request') || lowerPrompt.includes('export')) {
      category = 'feature_request';
      suggested_team = 'engineering';
      summary = 'Customer requested a new product feature or enhancement.';
      key_entities.push('feature_request');
    }

    if (lowerPrompt.includes('urgent') || lowerPrompt.includes('down') || lowerPrompt.includes('breach') || lowerPrompt.includes('security') || lowerPrompt.includes('immediately')) {
      urgency = 'critical';
      suggested_team = lowerPrompt.includes('breach') || lowerPrompt.includes('security') ? 'security' : 'engineering';
      summary = 'CRITICAL: Urgent security or downtime incident reported by customer.';
    } else if (lowerPrompt.includes('angry') || lowerPrompt.includes('frustrated') || lowerPrompt.includes('horrible') || lowerPrompt.includes('terrible') || lowerPrompt.includes('unacceptable')) {
      sentiment = 'frustrated';
      urgency = urgency === 'critical' ? 'critical' : 'high';
    } else if (lowerPrompt.includes('thanks') || lowerPrompt.includes('great') || lowerPrompt.includes('awesome')) {
      sentiment = 'positive';
      action_required = false;
    }

    const mockResponse: TriageResponse = {
      category,
      urgency,
      sentiment,
      action_required,
      summary,
      suggested_team,
      confidence_score: 0.95,
      key_entities,
    };

    return schema.parse(mockResponse);
  }
}

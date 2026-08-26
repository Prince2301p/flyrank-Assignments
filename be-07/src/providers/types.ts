import { ZodSchema } from 'zod';

export interface ProviderGenerateOptions {
  model?: string;
  signal?: AbortSignal;
  systemPrompt?: string;
}

export interface ILLMProvider {
  readonly name: string;
  generateStructuredOutput<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: ProviderGenerateOptions
  ): Promise<T>;
}

export class LLMProviderError extends Error {
  public readonly isRetryable: boolean;
  public readonly statusCode?: number;

  constructor(
    message: string,
    isRetryable: boolean = true,
    statusCode?: number
  ) {
    super(message);
    this.name = 'LLMProviderError';
    this.isRetryable = isRetryable;
    this.statusCode = statusCode;
  }
}

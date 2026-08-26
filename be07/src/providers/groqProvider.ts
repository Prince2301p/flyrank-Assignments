import Groq from 'groq-sdk';
import { ZodSchema } from 'zod';
import { ILLMProvider, ProviderGenerateOptions, LLMProviderError } from './types.js';

export class GroqProvider implements ILLMProvider {
  public readonly name = 'groq';
  private apiKey: string;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel: string = 'llama-3.3-70b-versatile') {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || '';
    this.defaultModel = defaultModel;
  }

  async generateStructuredOutput<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: ProviderGenerateOptions
  ): Promise<T> {
    if (!this.apiKey) {
      throw new LLMProviderError(
        'GROQ_API_KEY is not configured',
        false,
        401
      );
    }

    try {
      const groq = new Groq({ apiKey: this.apiKey });
      const model = options?.model || this.defaultModel;

      const systemPrompt =
        options?.systemPrompt ||
        'You are an expert backend AI data classifier. Analyze the input and output valid JSON matching the required schema.';

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        model,
        response_format: { type: 'json_object' },
      });

      const rawText = chatCompletion.choices[0]?.message?.content;
      if (!rawText) {
        throw new LLMProviderError(
          'Groq returned empty response',
          true,
          500
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch (jsonErr: any) {
        throw new LLMProviderError(
          `Failed to parse Groq response as JSON: ${jsonErr.message}`,
          true,
          500
        );
      }

      const validationResult = schema.safeParse(parsed);
      if (!validationResult.success) {
        throw new LLMProviderError(
          `Groq output schema validation failed: ${validationResult.error.message}`,
          true,
          422
        );
      }

      return validationResult.data;
    } catch (err: any) {
      if (err instanceof LLMProviderError) {
        throw err;
      }

      const status = err.status || err.statusCode || 500;
      const isRetryable = status === 429 || status >= 500;

      throw new LLMProviderError(
        `Groq API Error: ${err.message || String(err)}`,
        isRetryable,
        status
      );
    }
  }
}

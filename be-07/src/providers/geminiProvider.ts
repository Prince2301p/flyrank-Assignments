import { GoogleGenAI } from '@google/genai';
import { ZodSchema } from 'zod';
import { ILLMProvider, ProviderGenerateOptions, LLMProviderError } from './types.js';

export class GeminiProvider implements ILLMProvider {
  public readonly name = 'gemini';
  private apiKey: string;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel: string = 'gemini-2.5-flash') {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.defaultModel = defaultModel;
  }

  async generateStructuredOutput<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: ProviderGenerateOptions
  ): Promise<T> {
    if (!this.apiKey) {
      throw new LLMProviderError(
        'GEMINI_API_KEY is not configured',
        false,
        401
      );
    }

    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      const model = options?.model || this.defaultModel;

      const systemPrompt =
        options?.systemPrompt ||
        'You are an expert backend AI data classifier. Analyze the prompt and return strictly valid JSON matching the target schema. Do not output markdown code blocks or explanations.';

      const formattedPrompt = `${systemPrompt}\n\nUser Request:\n${prompt}`;

      const response = await ai.models.generateContent({
        model,
        contents: formattedPrompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new LLMProviderError(
          'Gemini returned empty response',
          true,
          500
        );
      }

      let parsed: unknown;
      try {
        // Strip markdown code fences if model accidentally includes them
        const cleanedText = rawText.replace(/```json\n?|\n?```/g, '').trim();
        parsed = JSON.parse(cleanedText);
      } catch (jsonErr: any) {
        throw new LLMProviderError(
          `Failed to parse Gemini response as JSON: ${jsonErr.message}`,
          true,
          500
        );
      }

      // Validate against Zod schema
      const validationResult = schema.safeParse(parsed);
      if (!validationResult.success) {
        throw new LLMProviderError(
          `Gemini output schema validation failed: ${validationResult.error.message}`,
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
        `Gemini API Error: ${err.message || String(err)}`,
        isRetryable,
        status
      );
    }
  }
}

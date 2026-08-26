import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { TriageRequestSchema, TriageResponseSchema } from './schemas/ticket.js';
import { LLMService } from './services/llmService.js';
import { ILLMProvider } from './providers/types.js';

dotenv.config();

export function createApp(customProvider?: ILLMProvider, customTimeoutMs?: number, customMaxRetries?: number) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const llmService = new LLMService({
    customProvider,
    timeoutMs: customTimeoutMs,
    maxRetries: customMaxRetries,
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'ai-judgement-api',
      timestamp: new Date().toISOString(),
    });
  });

  // Main LLM Judgment Endpoint: Ticket Triage & Information Extractor
  app.post('/api/v1/triage', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Validate request body with Zod
      const parseResult = TriageRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request payload schema',
          details: parseResult.error.errors,
        });
        return;
      }

      const { message, customer_name, ticket_id, metadata } = parseResult.data;

      // 2. Build structured prompt for LLM judgment call
      const prompt = `
Analyze the following customer support submission:

Ticket ID: ${ticket_id || 'N/A'}
Customer Name: ${customer_name || 'Anonymous'}
Customer Tier: ${metadata?.customer_tier || 'standard'}
Source Channel: ${metadata?.source || 'web'}

Customer Message:
"""
${message}
"""

Instructions:
Evaluate the message and provide a trustworthy judgment.
Classify category, assess urgency, detect sentiment, state if action is required, summarize in 1 sentence, identify suggested team, state confidence score, and list key entities.
`.trim();

      // 3. Delegate to trustworthy LLM service (with timeout, retries, and Zod validation)
      const { data, metadata: execMeta } = await llmService.executeJudgement(
        prompt,
        TriageResponseSchema
      );

      // 4. Return trusted response payload
      res.json({
        success: true,
        data,
        meta: execMeta,
      });
    } catch (err: any) {
      const isTimeout = err.message?.includes('timed out');
      const statusCode = isTimeout ? 504 : 500;

      res.status(statusCode).json({
        success: false,
        error: err.message || 'Failed to complete AI model judgment',
        attempts: err.attempts,
        executionTimeMs: err.executionTimeMs,
      });
    }
  });

  return { app, llmService };
}

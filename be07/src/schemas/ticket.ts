import { z } from 'zod';

export const CategoryEnum = z.enum([
  'billing',
  'bug_report',
  'feature_request',
  'account_access',
  'general_inquiry',
]);
export type Category = z.infer<typeof CategoryEnum>;

export const UrgencyEnum = z.enum(['low', 'medium', 'high', 'critical']);
export type Urgency = z.infer<typeof UrgencyEnum>;

export const SentimentEnum = z.enum(['positive', 'neutral', 'negative', 'frustrated']);
export type Sentiment = z.infer<typeof SentimentEnum>;

export const TeamEnum = z.enum([
  'engineering',
  'billing_dept',
  'customer_support',
  'security',
]);
export type Team = z.infer<typeof TeamEnum>;

/**
 * Zod schema for input ticket triage requests
 */
export const TriageRequestSchema = z.object({
  ticket_id: z.string().optional(),
  customer_name: z.string().optional(),
  message: z.string().min(3, 'Message must be at least 3 characters long'),
  metadata: z
    .object({
      source: z.string().optional(),
      customer_tier: z.enum(['free', 'pro', 'enterprise']).optional(),
    })
    .optional(),
});

export type TriageRequest = z.infer<typeof TriageRequestSchema>;

/**
 * Zod schema for structured LLM judgment output
 * This schema guarantees runtime type safety for downstream applications.
 */
export const TriageResponseSchema = z.object({
  category: CategoryEnum,
  urgency: UrgencyEnum,
  sentiment: SentimentEnum,
  action_required: z.boolean(),
  summary: z.string().min(5, 'Summary must be meaningful'),
  suggested_team: TeamEnum,
  confidence_score: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score between 0.0 and 1.0'),
  key_entities: z.array(z.string()).default([]),
});

export type TriageResponse = z.infer<typeof TriageResponseSchema>;

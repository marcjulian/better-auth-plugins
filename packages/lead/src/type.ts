import type { InferOptionSchema, StandardSchemaV1 } from 'better-auth';

import type { lead } from './schema';

export interface LeadOptions {
  /**
   * Send a verification email
   * @param data the data object
   * @param request the request object
   */
  sendVerificationEmail?: (
    /**
     * @param email the email to send the verification email to
     * @param url the verification url
     * @param token the verification token
     */
    data: { email: string; url: string; token: string },
    request?: Request,
  ) => Promise<void>;

  onEmailVerified?: (
    /**
     * @param lead the lead that was verified
     */
    data: { lead: Lead },
    request?: Request,
  ) => Promise<void>;

  /**
   * Number of seconds the verification token is
   * valid for.
   * @default 3600 seconds (1 hour)
   */
  expiresIn?: number;

  /**
   * Rate limit configuration for /lead/subscribe and /lead/resend endpoints.
   */
  rateLimit?: {
    /**
     * Time window in seconds for which the rate limit applies.
     * @default 10 seconds
     */
    window: number;
    /**
     * Maximum number of requests allowed within the time window.
     * @default 3 requests
     */
    max: number;
  };

  /**
   * Schema for the lead plugin
   */
  schema?: InferOptionSchema<typeof lead> | undefined;

  metadata?: {
    validationSchema?: StandardSchemaV1;
  };
}

export interface Lead {
  /**
   * Database identifier
   */
  id: string;

  createdAt: Date;

  updatedAt: Date;

  email: string;

  emailVerified: boolean;

  metadata?: string;
}

export type LeadPayload = Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'emailVerified'>;

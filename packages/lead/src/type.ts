import type { InferOptionSchema, StandardSchemaV1 } from 'better-auth';

import type { lead } from './schema';

export interface LeadOptions {
  /**
   * Send a verification email
   * @param data the data object
   * @param request the request object
   */
  sendConfirmationEmail?: (
    /**
     * @param lead the lead to send the confirmation email to
     * @param email the email address to send the confirmation to
     * @param url the confirmation url
     * @param token the confirmation token
     * @param unsubscribeUrl the one-click unsubscribe URL (RFC 8058) to include in List-Unsubscribe headers
     */
    data: { lead: Lead; email: string; url: string; token: string; unsubscribeUrl: string },
    request?: Request,
  ) => Promise<boolean>;

  onConfirmed?: (
    /**
     * @param lead the lead that confirmed their subscription
     */
    data: { lead: Lead },
    request?: Request,
  ) => Promise<void>;

  /**
   * Number of seconds the confirmation token is
   * valid for.
   * @default 3600 seconds (1 hour)
   */
  expiresIn?: number;

  /**
   * Number of seconds the unsubscribe token is valid for.
   * Should be long-lived since users may click the link long
   * after receiving the email.
   * @default undefined (no expiry)
   */
  unsubscribeExpiresIn?: number;

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

  email: string | null;

  userId: string | null;

  confirmed: boolean;

  confirmationSentAt: Date | null;

  metadata?: string;
}

export type LeadPayload = {
  email?: string | null;
  userId?: string | null;
  metadata?: string;
};

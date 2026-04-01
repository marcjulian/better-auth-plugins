import type { InferOptionSchema, StandardSchemaV1 } from 'better-auth';
import * as z from 'zod';

import type { cookieConsent } from './schema';

/**
 * Consent categories mapped to boolean values.
 * Each key represents a cookie category (e.g., "analytics", "marketing").
 */
export type ConsentSchemaModel = z.ZodObject<Record<string, z.ZodBoolean>>;
export type Consent = z.infer<ConsentSchemaModel>;

/**
 * Options for the cookie consent plugin.
 */
export interface CookieConsentOptions {
  /**
   * Current consent version identifier.
   * When this changes, stored consents with older versions
   * are considered outdated and users must re-consent.
   * @default "v1"
   */
  consentVersion?: string;

  /**
   * Callback invoked whenever consent changes.
   * @param data the consent record and request
   */
  onConsentChange?: (data: { consent: CookieConsentRecord }, request?: Request) => Promise<void>;

  /**
   * Rate limit configuration for consent endpoints.
   */
  rateLimit?: {
    /**
     * Time window in seconds for which the rate limit applies.
     * @default 10
     */
    window: number;
    /**
     * Maximum number of requests allowed within the time window.
     * @default 10 requests
     */
    max: number;
  };

  /**
   * Schema overrides for the cookie consent table.
   */
  schema?: InferOptionSchema<typeof cookieConsent> | undefined;

  /**
   * Consent validation configuration.
   */
  consent?: {
    /**
     * A Standard Schema (e.g. Zod) used to validate the consent
     * object on every `setConsent` call. When omitted, the
     * consent object is accepted as-is (any `Record<string, boolean>`).
     */
    validationSchema?: StandardSchemaV1 & ConsentSchemaModel;
  };
}

/**
 * A stored cookie consent record.
 */
export interface CookieConsentRecord {
  /**
   * Database identifier.
   */
  id: string;

  /**
   * The authenticated user ID, if available.
   */
  userId?: string | null;

  /**
   * An anonymous identifier for unauthenticated users.
   */
  anonymousId: string;

  /**
   * JSON-encoded consent preferences.
   */
  consent: string;

  /**
   * The version of the consent policy.
   */
  consentVersion: string;

  /**
   * Timestamp when the consent was recorded.
   */
  timestamp: Date;
}

/**
 * Payload for creating/updating a consent record (without auto-generated fields).
 */
export type CookieConsentPayload = Omit<CookieConsentRecord, 'id'>;

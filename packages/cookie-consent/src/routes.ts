import { BASE_ERROR_CODES, type InternalLogger } from 'better-auth';
import { APIError, createAuthEndpoint, getSessionFromCtx } from 'better-auth/api';
import * as z from 'zod';

import { COOKIE_CONSENT_ERROR_CODES } from './error-codes';
import type { CookieConsentOptions, CookieConsentPayload, CookieConsentRecord } from './type';

const setConsentSchema = z.object({
  anonymousId: z.string().meta({
    description: 'Anonymous identifier for unauthenticated users',
  }),
  consent: z.record(z.string(), z.boolean()).meta({
    description: 'Consent preferences as category-boolean pairs',
  }),
  consentVersion: z.string().meta({
    description: 'Version of the consent policy',
  }),
});

const acceptOrRejectSchema = z.object({
  anonymousId: z.string().meta({
    description: 'Anonymous identifier for unauthenticated users',
  }),
  consentVersion: z.string().meta({
    description: 'Version of the consent policy',
  }),
});

const getConsentSchema = z.object({
  anonymousId: z.string().optional().meta({
    description: 'Anonymous identifier fallback when no session exists',
  }),
});

const mergeConsentSchema = z.object({
  anonymousId: z.string().meta({
    description: 'Anonymous identifier to merge consent from',
  }),
});

export const setConsent = <O extends CookieConsentOptions>(options: O) =>
  createAuthEndpoint(
    '/cookie-consent/set',
    {
      method: 'POST',
      body: setConsentSchema,
    },
    async (ctx) => {
      const { anonymousId, consent, consentVersion } = ctx.body;

      if (!anonymousId) {
        throw APIError.from('BAD_REQUEST', COOKIE_CONSENT_ERROR_CODES.MISSING_ANONYMOUS_ID);
      }

      if (!consent || Object.keys(consent).length === 0) {
        throw APIError.from('BAD_REQUEST', COOKIE_CONSENT_ERROR_CODES.INVALID_CONSENT);
      }

      const validatedConsent = validateConsent(options, consent, ctx.context.logger);

      const session = await getSessionFromCtx(ctx);
      const userId = session?.user?.id ?? null;

      // Look for existing record by userId or anonymousId
      const existing = await findConsentRecord(ctx, userId, anonymousId);

      const consentJson = JSON.stringify(validatedConsent);
      const now = new Date();

      if (existing) {
        await ctx.context.adapter.update<CookieConsentRecord>({
          model: 'cookieConsent',
          where: [{ field: 'id', value: existing.id }],
          update: {
            userId,
            consent: consentJson,
            consentVersion,
            timestamp: now,
          },
        });
      } else {
        await ctx.context.adapter.create<CookieConsentPayload, CookieConsentRecord>({
          model: 'cookieConsent',
          data: {
            userId,
            anonymousId,
            consent: consentJson,
            consentVersion,
            timestamp: now,
          },
        });
      }

      if (options.onConsentChange) {
        const record =
          (await findConsentRecord(ctx, userId, anonymousId)) ??
          ({
            id: '',
            userId,
            anonymousId,
            consent: consentJson,
            consentVersion,
            timestamp: now,
          } as CookieConsentRecord);

        await ctx.context.runInBackgroundOrAwait(
          options.onConsentChange({ consent: record }, ctx.request),
        );
      }

      return ctx.json({ status: true });
    },
  );

export const getConsent = <O extends CookieConsentOptions>(options: O) =>
  createAuthEndpoint(
    '/cookie-consent/get',
    {
      method: 'GET',
      query: getConsentSchema,
    },
    async (ctx) => {
      const session = await getSessionFromCtx(ctx);
      const userId = session?.user?.id ?? null;
      const anonymousId = ctx.query?.anonymousId;

      if (!userId && !anonymousId) {
        throw APIError.from('BAD_REQUEST', COOKIE_CONSENT_ERROR_CODES.MISSING_ANONYMOUS_ID);
      }

      const record = await findConsentRecord(ctx, userId, anonymousId);

      if (!record) {
        return ctx.json({ consent: null, versionMatch: false });
      }

      const currentVersion = options.consentVersion ?? 'v1';
      const versionMatch = record.consentVersion === currentVersion;

      return ctx.json({
        consent: {
          id: record.id,
          userId: record.userId,
          anonymousId: record.anonymousId,
          consent: JSON.parse(record.consent) as Record<string, boolean>,
          consentVersion: record.consentVersion,
          timestamp: record.timestamp,
        },
        versionMatch,
      });
    },
  );

export const mergeConsent = <O extends CookieConsentOptions>(_options: O) =>
  createAuthEndpoint(
    '/cookie-consent/merge',
    {
      method: 'POST',
      body: mergeConsentSchema,
    },
    async (ctx) => {
      const session = await getSessionFromCtx(ctx);
      const userId = session?.user?.id;

      if (!userId) {
        throw APIError.from('UNAUTHORIZED', COOKIE_CONSENT_ERROR_CODES.AUTHENTICATION_REQUIRED);
      }

      const merged = await mergeAnonymousConsentToUser(ctx.context.adapter, userId, ctx.body.anonymousId);
      return ctx.json({ status: true, merged });
    },
  );

export const acceptAllConsent = <O extends CookieConsentOptions>(options: O) =>
  createAuthEndpoint(
    '/cookie-consent/accept-all',
    {
      method: 'POST',
      body: acceptOrRejectSchema,
    },
    async (ctx) => {
      const { anonymousId, consentVersion } = ctx.body;

      if (!anonymousId) {
        throw APIError.from('BAD_REQUEST', COOKIE_CONSENT_ERROR_CODES.MISSING_ANONYMOUS_ID);
      }

      const categories = getCategoriesFromSchema(options);
      const consent: Record<string, boolean> = {};
      for (const cat of categories) {
        consent[cat] = true;
      }

      const validatedConsent = validateConsent(options, consent, ctx.context.logger);
      const session = await getSessionFromCtx(ctx);
      const userId = session?.user?.id ?? null;
      const existing = await findConsentRecord(ctx, userId, anonymousId);
      const consentJson = JSON.stringify(validatedConsent);
      const now = new Date();

      if (existing) {
        await ctx.context.adapter.update<CookieConsentRecord>({
          model: 'cookieConsent',
          where: [{ field: 'id', value: existing.id }],
          update: { userId, consent: consentJson, consentVersion, timestamp: now },
        });
      } else {
        await ctx.context.adapter.create<CookieConsentPayload, CookieConsentRecord>({
          model: 'cookieConsent',
          data: { userId, anonymousId, consent: consentJson, consentVersion, timestamp: now },
        });
      }

      return ctx.json({ status: true });
    },
  );

export const rejectAllConsent = <O extends CookieConsentOptions>(options: O) =>
  createAuthEndpoint(
    '/cookie-consent/reject-all',
    {
      method: 'POST',
      body: acceptOrRejectSchema,
    },
    async (ctx) => {
      const { anonymousId, consentVersion } = ctx.body;

      if (!anonymousId) {
        throw APIError.from('BAD_REQUEST', COOKIE_CONSENT_ERROR_CODES.MISSING_ANONYMOUS_ID);
      }

      const categories = getCategoriesFromSchema(options);
      const consent: Record<string, boolean> = {};
      for (const cat of categories) {
        consent[cat] = false;
      }

      const validatedConsent = validateConsent(options, consent, ctx.context.logger);
      const session = await getSessionFromCtx(ctx);
      const userId = session?.user?.id ?? null;
      const existing = await findConsentRecord(ctx, userId, anonymousId);
      const consentJson = JSON.stringify(validatedConsent);
      const now = new Date();

      if (existing) {
        await ctx.context.adapter.update<CookieConsentRecord>({
          model: 'cookieConsent',
          where: [{ field: 'id', value: existing.id }],
          update: { userId, consent: consentJson, consentVersion, timestamp: now },
        });
      } else {
        await ctx.context.adapter.create<CookieConsentPayload, CookieConsentRecord>({
          model: 'cookieConsent',
          data: { userId, anonymousId, consent: consentJson, consentVersion, timestamp: now },
        });
      }

      return ctx.json({ status: true });
    },
  );

/**
 * Merge anonymous consent into a user's record.
 * Shared between the merge endpoint and the sign-in/sign-up hook.
 *
 * @returns `true` if consent was merged, `false` if no anonymous record was found.
 */
export async function mergeAnonymousConsentToUser(
  adapter: {
    findOne: <T>(opts: { model: string; where: { field: string; value: string }[] }) => Promise<T | null>;
    update: <T>(opts: { model: string; where: { field: string; value: string }[]; update: Partial<T> }) => Promise<T | null>;
    delete: (opts: { model: string; where: { field: string; value: string }[] }) => Promise<void>;
  },
  userId: string,
  anonymousId: string,
): Promise<boolean> {
  const anonymousRecord = await adapter.findOne<CookieConsentRecord>({
    model: 'cookieConsent',
    where: [{ field: 'anonymousId', value: anonymousId }],
  });

  if (!anonymousRecord || anonymousRecord.userId) return false;

  const userRecord = await adapter.findOne<CookieConsentRecord>({
    model: 'cookieConsent',
    where: [{ field: 'userId', value: userId }],
  });

  if (userRecord) {
    // User already has consent; update with anonymous data
    await adapter.update<CookieConsentRecord>({
      model: 'cookieConsent',
      where: [{ field: 'id', value: userRecord.id }],
      update: {
        consent: anonymousRecord.consent,
        consentVersion: anonymousRecord.consentVersion,
        anonymousId,
        timestamp: new Date(),
      },
    });
    await adapter.delete({
      model: 'cookieConsent',
      where: [{ field: 'id', value: anonymousRecord.id }],
    });
  } else {
    // Attach anonymous consent to user
    await adapter.update<CookieConsentRecord>({
      model: 'cookieConsent',
      where: [{ field: 'id', value: anonymousRecord.id }],
      update: { userId },
    });
  }

  return true;
}

/**
 * Find a consent record by userId (preferred) or anonymousId fallback.
 */
async function findConsentRecord(
  ctx: {
    context: {
      adapter: {
        findOne: <T>(opts: {
          model: string;
          where: { field: string; value: string }[];
        }) => Promise<T | null>;
      };
    };
  },
  userId: string | null | undefined,
  anonymousId: string | undefined,
): Promise<CookieConsentRecord | null> {
  if (userId) {
    const byUser = await ctx.context.adapter.findOne<CookieConsentRecord>({
      model: 'cookieConsent',
      where: [{ field: 'userId', value: userId }],
    });
    if (byUser) return byUser;
  }

  if (anonymousId) {
    return ctx.context.adapter.findOne<CookieConsentRecord>({
      model: 'cookieConsent',
      where: [{ field: 'anonymousId', value: anonymousId }],
    });
  }

  return null;
}

/**
 * Validate the consent object against the configured validation schema.
 * Returns the validated consent or the original consent when no schema is set.
 */
function validateConsent(
  options: CookieConsentOptions,
  consent: Record<string, boolean>,
  logger: InternalLogger,
): Record<string, boolean> {
  if (!options.consent?.validationSchema) {
    return consent;
  }
  const validationResult = options.consent.validationSchema['~standard'].validate(consent);

  if (validationResult instanceof Promise) {
    throw APIError.from('INTERNAL_SERVER_ERROR', BASE_ERROR_CODES.ASYNC_VALIDATION_NOT_SUPPORTED);
  }

  if (validationResult.issues) {
    logger.error('Invalid consent', validationResult.issues);
    throw APIError.from('BAD_REQUEST', COOKIE_CONSENT_ERROR_CODES.INVALID_CONSENT);
  }

  return validationResult.value as Record<string, boolean>;
}

/**
 * Extract category keys from the validation schema.
 * Inspects the Zod schema's `shape` (or `_def.shape`) to derive keys.
 * Falls back to an empty array when no schema is configured.
 */
function getCategoriesFromSchema(options: CookieConsentOptions): string[] {
  const schema = options.consent?.validationSchema;
  if (!schema) return [];

  // Zod schemas expose a `shape` property containing the field definitions.
  const shape = (schema as Record<string, unknown>)['shape'] as Record<string, unknown> | undefined;
  if (shape && typeof shape === 'object') {
    return Object.keys(shape);
  }

  // Fallback: inspect `_def.shape` (Zod internal)
  const def = (schema as Record<string, unknown>)['_def'] as Record<string, unknown> | undefined;
  if (def && typeof def === 'object') {
    const defShape = def['shape'] as Record<string, unknown> | (() => Record<string, unknown>) | undefined;
    if (typeof defShape === 'function') {
      return Object.keys(defShape());
    }
    if (defShape && typeof defShape === 'object') {
      return Object.keys(defShape);
    }
  }

  return [];
}

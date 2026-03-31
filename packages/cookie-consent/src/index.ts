import type { BetterAuthPlugin } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import * as z from 'zod';

import { COOKIE_CONSENT_ERROR_CODES } from './error-codes';
import { getConsent, mergeConsent, setConsent } from './routes';
import { getSchema } from './schema';
import type { Consent, CookieConsentOptions, CookieConsentRecord } from './type';

/**
 * Cookie name used to store the anonymous consent ID.
 * The client sets this cookie so the server-side hook can
 * read it during sign-in to auto-merge anonymous consent.
 */
export const ANONYMOUS_ID_COOKIE = 'cookie-consent-anon-id';

/**
 * Parse a single cookie value from a raw `Cookie` header string.
 */
function parseCookieValue(
  cookieHeader: string | null | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const pair of cookieHeader.split('; ')) {
    const [key, ...valueParts] = pair.split('=');
    if (key === name && valueParts.length > 0) {
      const raw = valueParts.join('=');
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return undefined;
}

/**
 * Preset validation schema for cookie consent.
 * Validates the standard consent categories: necessary, analytics, marketing, functional.
 * Use this with `consent.validationSchema` in the plugin options.
 *
 * @example
 * ```ts
 * cookieConsentPlugin({
 *   consentVersion: 'v1',
 *   consent: { validationSchema: defaultConsentSchema },
 * })
 * ```
 */
export const defaultConsentSchema = z.object({
  necessary: z.boolean(),
  analytics: z.boolean(),
  marketing: z.boolean(),
  functional: z.boolean(),
});

export const cookieConsentPlugin = <O extends CookieConsentOptions>(options: O = {} as O) => {
  return {
    id: 'cookie-consent',
    schema: getSchema(options),
    endpoints: {
      setConsent: setConsent(options),
      getConsent: getConsent(options),
      mergeConsent: mergeConsent(options),
    },
    hooks: {
      after: [
        {
          // After sign-in, merge anonymous consent to user
          matcher: (context) => {
            return context.path === '/sign-in/email' || context.path === '/sign-in/social';
          },
          handler: createAuthMiddleware(async (ctx) => {
            const userId = ctx.context.newSession?.user?.id;
            if (!userId) return;

            // Read anonymousId from the cookie set by the client
            const anonymousId = parseCookieValue(
              ctx.headers?.get('cookie'),
              ANONYMOUS_ID_COOKIE,
            );
            if (!anonymousId) return;

            const anonymousRecord =
              await ctx.context.adapter.findOne<CookieConsentRecord>({
                model: 'cookieConsent',
                where: [{ field: 'anonymousId', value: anonymousId }],
              });

            if (!anonymousRecord || anonymousRecord.userId) return;

            const userRecord =
              await ctx.context.adapter.findOne<CookieConsentRecord>({
                model: 'cookieConsent',
                where: [{ field: 'userId', value: userId }],
              });

            if (userRecord) {
              // User already has consent; update with anonymous data
              await ctx.context.adapter.update<CookieConsentRecord>({
                model: 'cookieConsent',
                where: [{ field: 'id', value: userRecord.id }],
                update: {
                  consent: anonymousRecord.consent,
                  consentVersion: anonymousRecord.consentVersion,
                  anonymousId,
                  timestamp: new Date(),
                },
              });
              await ctx.context.adapter.delete({
                model: 'cookieConsent',
                where: [{ field: 'id', value: anonymousRecord.id }],
              });
            } else {
              // Attach anonymous consent to user
              await ctx.context.adapter.update<CookieConsentRecord>({
                model: 'cookieConsent',
                where: [{ field: 'id', value: anonymousRecord.id }],
                update: { userId },
              });
            }
          }),
        },
      ],
    },
    options: options as NoInfer<O>,
    rateLimit: [
      {
        pathMatcher: (path) =>
          ['/cookie-consent/set', '/cookie-consent/merge'].includes(path),
        window: options.rateLimit?.window ?? 10,
        max: options.rateLimit?.max ?? 10,
      },
    ],
    $ERROR_CODES: COOKIE_CONSENT_ERROR_CODES,
  } satisfies BetterAuthPlugin;
};

// ─── Helper utilities ──────────────────────────────────────────────────

/**
 * Extract the parsed consent object from the endpoint context.
 * Returns `null` if no consent is available.
 */
export async function getConsentFromCtx(ctx: {
  context: {
    adapter: {
      findOne: <T>(opts: {
        model: string;
        where: { field: string; value: string }[];
      }) => Promise<T | null>;
    };
    session?: { user?: { id?: string } } | null;
  };
  query?: { anonymousId?: string };
}): Promise<CookieConsentRecord | null> {
  const userId = ctx.context.session?.user?.id ?? null;
  const anonymousId = ctx.query?.anonymousId;

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
 * Check if a specific consent category is granted.
 */
export async function hasConsent(
  ctx: Parameters<typeof getConsentFromCtx>[0],
  category: string,
): Promise<boolean> {
  const record = await getConsentFromCtx(ctx);
  if (!record) return false;
  const parsed = JSON.parse(record.consent) as Consent;
  return parsed[category] === true;
}

export type * from './type';

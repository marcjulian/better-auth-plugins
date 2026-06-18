import type { BetterAuthClientPlugin } from 'better-auth/client';
import { atom } from 'nanostores';
import type z from 'zod';

import type { Consent, cookieConsentPlugin, defaultConsentSchema } from './index';

/**
 * Client-side consent state, kept in sync with the server.
 */
export interface ConsentState<TConsent extends Consent = Consent> {
  consent: TConsent | null;
  consentVersion: string | null;
  versionMatch: boolean;
}

/**
 * Inferred type from the default consent schema.
 */
export type DefaultConsentModel = z.infer<typeof defaultConsentSchema>;

/**
 * Client plugin for cookie consent management.
 *
 * @typeParam TConsent - The consent shape, defaults to `DefaultConsentModel`.
 *
 * @example
 * ```ts
 * import { cookieConsentClient, type DefaultConsentModel } from 'better-auth-cookie-consent/client';
 *
 * const authClient = createAuthClient({
 *   plugins: [cookieConsentClient<DefaultConsentModel>()],
 * });
 * ```
 */
export const cookieConsentClient = <TConsent extends Consent = Consent>() => {
  return {
    id: 'cookie-consent',
    $InferServerPlugin: {} as ReturnType<typeof cookieConsentPlugin>,

    getAtoms($fetch) {
      const $consent = atom<ConsentState<TConsent>>({
        consent: null,
        consentVersion: null,
        versionMatch: false,
      });
      return { $consent };
    },

    getActions($fetch, $store) {
      const consentAtom = $store.atoms.$consent as ReturnType<typeof atom<ConsentState<TConsent>>>;

      async function syncFromServer(anonymousId?: string) {
        let path = '/cookie-consent/get';
        if (anonymousId) {
          const params = new URLSearchParams({ anonymousId });
          path = `${path}?${params.toString()}`;
        }
        const res = await $fetch<{
          consent: {
            id: string;
            userId?: string | null;
            anonymousId: string;
            consent: TConsent;
            consentVersion: string;
            timestamp: string;
          } | null;
          versionMatch: boolean;
        }>(`${path}`, { method: 'GET' });
        if (res.data) {
          consentAtom.set({
            consent: res.data.consent?.consent ?? null,
            consentVersion: res.data.consent?.consentVersion ?? null,
            versionMatch: res.data.versionMatch,
          });
        }
        return res;
      }

      return {
        cookieConsent: {
          /**
           * Set consent preferences on the server.
           * Also used for accept-all / reject-all by passing the
           * appropriate consent object (all `true` or all `false`).
           */
          setConsent: async (data: {
            anonymousId: string;
            consent: TConsent;
            consentVersion: string;
          }) => {
            const res = await $fetch<{ status: boolean }>('/cookie-consent/set', {
              method: 'POST',
              body: data,
            });
            if (res.data?.status) {
              consentAtom.set({
                consent: data.consent,
                consentVersion: data.consentVersion,
                versionMatch: true,
              });
            }
            return res;
          },

          /**
           * Retrieve consent from the server.
           */
          getConsent: async (anonymousId?: string) => {
            return syncFromServer(anonymousId);
          },

          /**
           * Merge anonymous consent into the authenticated user's record.
           */
          mergeConsent: async (anonymousId: string) => {
            const res = await $fetch<{ status: boolean; merged: boolean }>(
              '/cookie-consent/merge',
              {
                method: 'POST',
                body: { anonymousId },
              },
            );
            if (res.data?.merged) {
              await syncFromServer(anonymousId);
            }
            return res;
          },
        },
      };
    },

    // $ERROR_CODES: COOKIE_CONSENT_ERROR_CODES,
  } satisfies BetterAuthClientPlugin;
};

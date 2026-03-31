import type { BetterAuthClientPlugin } from 'better-auth/client';
import { atom } from 'nanostores';

import { COOKIE_CONSENT_ERROR_CODES } from './error-codes';
import type { cookieConsentPlugin } from './index';
import type { Consent } from './type';

/**
 * Client-side consent state, kept in sync with the server.
 */
export interface ConsentState {
  consent: Consent | null;
  consentVersion: string | null;
  versionMatch: boolean;
}

export const cookieConsentClient = () => {
  return {
    id: 'cookie-consent',
    $InferServerPlugin: {} as ReturnType<typeof cookieConsentPlugin>,

    getAtoms($fetch) {
      const $consent = atom<ConsentState>({
        consent: null,
        consentVersion: null,
        versionMatch: false,
      });
      return { $consent };
    },

    getActions($fetch, $store) {
      const consentAtom = $store.atoms.$consent as ReturnType<
        typeof atom<ConsentState>
      >;

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
            consent: Consent;
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
           */
          setConsent: async (data: {
            anonymousId: string;
            consent: Consent;
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
           * Accept all consent categories.
           */
          acceptAll: async (data: {
            anonymousId: string;
            categories: string[];
            consentVersion: string;
          }) => {
            const consent: Consent = {};
            for (const cat of data.categories) {
              consent[cat] = true;
            }
            const res = await $fetch<{ status: boolean }>('/cookie-consent/set', {
              method: 'POST',
              body: {
                anonymousId: data.anonymousId,
                consent,
                consentVersion: data.consentVersion,
              },
            });
            if (res.data?.status) {
              consentAtom.set({
                consent,
                consentVersion: data.consentVersion,
                versionMatch: true,
              });
            }
            return res;
          },

          /**
           * Reject all consent categories.
           */
          rejectAll: async (data: {
            anonymousId: string;
            categories: string[];
            consentVersion: string;
          }) => {
            const consent: Consent = {};
            for (const cat of data.categories) {
              consent[cat] = false;
            }
            const res = await $fetch<{ status: boolean }>('/cookie-consent/set', {
              method: 'POST',
              body: {
                anonymousId: data.anonymousId,
                consent,
                consentVersion: data.consentVersion,
              },
            });
            if (res.data?.status) {
              consentAtom.set({
                consent,
                consentVersion: data.consentVersion,
                versionMatch: true,
              });
            }
            return res;
          },

          /**
           * Update specific consent category preferences.
           */
          updatePreferences: async (data: {
            anonymousId: string;
            consent: Consent;
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

    $ERROR_CODES: COOKIE_CONSENT_ERROR_CODES,
  } satisfies BetterAuthClientPlugin;
};

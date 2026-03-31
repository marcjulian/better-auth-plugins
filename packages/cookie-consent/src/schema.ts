import { type BetterAuthPluginDBSchema } from 'better-auth';
import { mergeSchema } from 'better-auth/db';

import type { CookieConsentOptions } from './type';

export const cookieConsent = {
  cookieConsent: {
    fields: {
      userId: {
        type: 'string',
        required: false,
        references: {
          model: 'user',
          field: 'id',
        },
      },
      anonymousId: {
        type: 'string',
        required: true,
      },
      consent: {
        type: 'string',
        required: true,
      },
      consentVersion: {
        type: 'string',
        required: true,
      },
      timestamp: {
        type: 'date',
        defaultValue: () => new Date(),
        required: true,
      },
    },
  },
} satisfies BetterAuthPluginDBSchema;

export const getSchema = <O extends CookieConsentOptions>(options: O) => {
  return mergeSchema(cookieConsent, options.schema);
};

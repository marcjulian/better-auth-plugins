import { prismaAdapter } from '@better-auth/prisma-adapter';
import { cookieConsentPlugin, defaultConsentSchema } from 'better-auth-cookie-consent';
import { lead } from 'better-auth-lead';
import { betterAuth } from 'better-auth/minimal';

import { leadMetadataSchema } from '../../shared/lead-metadata-schema';
import { prisma } from './db';
import env from './env';

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: 'sqlite' }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    lead({
      sendConfirmationEmail: async ({ lead, email, url, token }) => {
        const { confirmationSentAt } = lead;
        if (
          confirmationSentAt &&
          Date.now() - confirmationSentAt.getTime() < 60 * 1000 // 1 minute
        ) {
          console.log(
            `Skipping sending confirmation email to ${lead.email} because a recent email was already sent.`,
          );
          return false;
        }

        console.log({ lead, email, url, token });

        return true;
      },
      onConfirmed: async ({ lead }) => {
        console.log({ lead });
      },
      metadata: {
        validationSchema: leadMetadataSchema,
      },
    }),
    cookieConsentPlugin({
      consentVersion: 'v1',
      consent: {
        validationSchema: defaultConsentSchema,
      },
    }),
  ],
});

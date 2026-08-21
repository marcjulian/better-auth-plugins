import { betterAuth } from 'better-auth';
import { cookieConsentPlugin, defaultConsentSchema } from 'better-auth-cookie-consent';
import { lead } from 'better-auth-lead';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';

import prisma from './db';

export default betterAuth({
  baseURL: process.env['API_URL'],
  secret: process.env['BETTER_AUTH_SECRET'],
  trustedOrigins: [process.env['APP_URL']!],
  advanced: {
    // enable cross subdomain cookies for auth sessions, when api and app are on different subdomains of the same root domain
    crossSubDomainCookies: {
      enabled: true,
      domain: 'localhost',
    },
  },
  database: prismaAdapter(prisma, { provider: 'sqlite' }),
  emailAndPassword: { enabled: true },
  plugins: [
    admin(),
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
    }),
    cookieConsentPlugin({
      consentVersion: 'v1',
      consent: {
        validationSchema: defaultConsentSchema,
      },
    }),
  ],
});

import { prismaAdapter } from '@better-auth/prisma-adapter';
import { cookieConsentPlugin, defaultConsentSchema } from 'better-auth-cookie-consent';
import { lead } from 'better-auth-lead';
import { betterAuth } from 'better-auth/minimal';
import * as z from 'zod';

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
      sendVerificationEmail: async ({ email, url, token }) => {
        console.log({ email, url, token });
      },
      onEmailVerified: async ({ lead }) => {
        console.log({ lead });
      },
      metadata: {
        validationSchema: z
          .object({
            role: z.string().optional(),
            interests: z.array(z.string()).optional(),
          })
          .optional(),
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

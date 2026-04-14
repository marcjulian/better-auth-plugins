import { prismaAdapter } from '@better-auth/prisma-adapter';
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
      sendVerificationEmail: async ({ lead, url, token }) => {
        const { verificationEmailSentAt } = lead;
        if (
          verificationEmailSentAt &&
          Date.now() - verificationEmailSentAt.getTime() < 60 * 1000 // 1 minute
        ) {
          console.log(
            `Skipping sending verification email to ${lead.email} because a recent email was already sent.`,
          );
          return false;
        }

        console.log({ email: lead.email, url, token });

        return true;
      },
      onEmailVerified: async ({ lead }) => {
        console.log({ lead });
      },
      metadata: {
        validationSchema: leadMetadataSchema,
      },
    }),
  ],
});

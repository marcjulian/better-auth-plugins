import { prismaAdapter } from '@better-auth/prisma-adapter';
import { lead } from 'better-auth-lead';
import { betterAuth } from 'better-auth/minimal';

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
    }),
  ],
});

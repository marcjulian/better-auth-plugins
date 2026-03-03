import { betterAuth } from 'better-auth/minimal';
import { prismaAdapter } from '@better-auth/prisma-adapter';

import { prisma } from './db';
import env from './env';

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: 'sqlite' }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [],
});

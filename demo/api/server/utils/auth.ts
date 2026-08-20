import { betterAuth } from 'better-auth';
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
  plugins: [admin()],
});

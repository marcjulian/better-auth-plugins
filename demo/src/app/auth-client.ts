import { defaultConsentSchema } from 'better-auth-cookie-consent';
import { cookieConsentClient } from 'better-auth-cookie-consent/client';
import { leadClient } from 'better-auth-lead/client';
import { createAuthClient } from 'better-auth/client';
import type { z } from 'zod';

export type ConsentModel = z.infer<typeof defaultConsentSchema>;

export const authClient = createAuthClient({
  plugins: [leadClient(), cookieConsentClient<ConsentModel>()],
});

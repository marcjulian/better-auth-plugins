import { cookieConsentClient } from 'better-auth-cookie-consent/client';
import { leadClient } from 'better-auth-lead/client';
import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
  plugins: [leadClient(), cookieConsentClient()],
});

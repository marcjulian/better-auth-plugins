import { createAuthClient } from 'better-auth/client';
import { leadClient } from 'better-auth-lead/client';

export const authClient = createAuthClient({
  plugins: [leadClient()],
});

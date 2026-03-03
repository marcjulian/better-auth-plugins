import { leadClient } from 'better-auth-lead/client';
import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
  plugins: [leadClient()],
});

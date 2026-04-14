import { leadClient } from 'better-auth-lead/client';
import { createAuthClient } from 'better-auth/client';

import type { LeadMetadata } from '../shared/lead-metadata-schema';

export const authClient = createAuthClient({
  plugins: [leadClient<LeadMetadata>()],
});

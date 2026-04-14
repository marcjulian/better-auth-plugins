import type { BetterAuthClientPlugin } from 'better-auth/client';

import type { lead } from './index';

type LeadPlugin = typeof lead;

export const leadClient = () => {
  return {
    id: 'lead',
    $InferServerPlugin: {} as ReturnType<LeadPlugin>,
  } satisfies BetterAuthClientPlugin;
};

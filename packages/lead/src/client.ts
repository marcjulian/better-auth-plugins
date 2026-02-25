import type { BetterAuthClientPlugin } from 'better-auth/client';
import type { lead } from './index';

export const leadClient = () => {
  return {
    id: 'lead',
    $InferServerPlugin: {} as ReturnType<typeof lead>,
  } satisfies BetterAuthClientPlugin;
};

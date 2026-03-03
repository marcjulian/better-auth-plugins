import type { BetterAuthClientPlugin } from 'better-auth/client';
import type { lead } from './index';
import { LEAD_ERROR_CODES } from './error-codes';

export const leadClient = () => {
  return {
    id: 'lead',
    $InferServerPlugin: {} as ReturnType<typeof lead>,
    $ERROR_CODES: LEAD_ERROR_CODES,
  } satisfies BetterAuthClientPlugin;
};

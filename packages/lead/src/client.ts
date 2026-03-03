import type { BetterAuthClientPlugin } from 'better-auth/client';

import { LEAD_ERROR_CODES } from './error-codes';
import type { lead } from './index';

export const leadClient = () => {
  return {
    id: 'lead',
    $InferServerPlugin: {} as ReturnType<typeof lead>,
    $ERROR_CODES: LEAD_ERROR_CODES,
  } satisfies BetterAuthClientPlugin;
};

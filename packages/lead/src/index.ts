import type { BetterAuthPlugin } from 'better-auth';

import { LEAD_ERROR_CODES } from './error-codes';
import {
  list,
  removeLead,
  resend,
  subscribe,
  unsubscribe,
  unsubscribeSession,
  update,
  verify,
} from './routes';
import { getSchema } from './schema';
import type { LeadOptions } from './type';

export const lead = <O extends LeadOptions>(options: O = {} as O) => {
  const endpoints = {
    subscribe: subscribe(options),
    verify: verify(options),
    unsubscribe: unsubscribe(options),
    unsubscribeSession: unsubscribeSession(options),
    resend: resend(options),
    update: update(options),
    ...(options.admin?.enabled ? { list: list(options), removeLead: removeLead(options) } : {}),
  };

  return {
    id: 'lead',
    schema: getSchema(options),
    endpoints,
    options: options as NoInfer<O>,
    rateLimit: [
      {
        pathMatcher: (path) => ['/lead/subscribe', '/lead/resend'].includes(path),
        window: options.rateLimit?.window ?? 10,
        max: options.rateLimit?.max ?? 3,
      },
    ],
    $ERROR_CODES: LEAD_ERROR_CODES,
  } satisfies BetterAuthPlugin;
};

export type * from './type';

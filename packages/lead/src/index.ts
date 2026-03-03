import type { BetterAuthPlugin } from 'better-auth';
import type { LeadOptions } from './type';
import { getSchema } from './schema';
import { resend, subscribe, unsubscribe, update, verify } from './routes';
import { LEAD_ERROR_CODES } from './error-codes';

export const lead = <O extends LeadOptions>(options: O = {} as O) => {
  return {
    id: 'lead',
    schema: getSchema(options),
    endpoints: {
      subscribe: subscribe(options),
      verify: verify(options),
      unsubscribe: unsubscribe(options),
      resend: resend(options),
      update: update(options),
    },
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

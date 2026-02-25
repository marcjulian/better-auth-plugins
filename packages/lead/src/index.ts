import type { BetterAuthPlugin } from 'better-auth';
import type { LeadOptions } from './type';
import { getSchema } from './schema';
import { resend, subscribe, unsubscribe, verify } from './routes';

export const lead = <O extends LeadOptions>(options: O) => {
  return {
    id: 'lead',
    schema: getSchema(options),
    endpoints: {
      subscribe: subscribe(options),
      verify: verify(options),
      unsubscribe: unsubscribe(options),
      resend: resend(options),
    },
    options: options as NoInfer<O>,
    rateLimit: [
      {
        pathMatcher: (path) => ['/lead/subscribe', '/lead/resend'].includes(path),
        window: options.rateLimit?.window ?? 10,
        max: options.rateLimit?.max ?? 3,
      },
    ],
  } satisfies BetterAuthPlugin;
};

export type * from './type';

import type { StandardSchemaV1 } from 'better-auth';
import type { BetterAuthClientPlugin } from 'better-auth/client';

import type { lead } from './index';
import type { LeadOptions } from './type';

export const leadClient = <TMetadata = undefined>() => {
  type O = [TMetadata] extends [undefined]
    ? LeadOptions
    : LeadOptions & { metadata: { validationSchema: StandardSchemaV1<unknown, TMetadata> } };
  return {
    id: 'lead',
    $InferServerPlugin: {} as ReturnType<typeof lead<O>>,
  } satisfies BetterAuthClientPlugin;
};

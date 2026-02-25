import { type BetterAuthPluginDBSchema } from 'better-auth';
import type { LeadOptions } from './type';
import { mergeSchema } from 'better-auth/db';

export const lead = {
  lead: {
    fields: {
      createdAt: {
        type: 'date',
        defaultValue: () => new Date(),
        required: true,
        input: false,
      },
      updatedAt: {
        type: 'date',
        defaultValue: () => new Date(),
        onUpdate: () => new Date(),
        required: true,
        input: false,
      },
      email: {
        type: 'string',
        required: true,
        unique: true,
      },
      emailVerified: {
        type: 'boolean',
        defaultValue: false,
        required: true,
        input: false,
      },
      metadata: {
        type: 'string',
        required: false,
      },
    },
  },
} satisfies BetterAuthPluginDBSchema;

export const getSchema = <O extends LeadOptions>(options: O) => {
  return mergeSchema(lead, options.schema);
};

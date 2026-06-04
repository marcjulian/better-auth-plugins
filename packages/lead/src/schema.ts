import { type BetterAuthPluginDBSchema } from 'better-auth';
import { mergeSchema } from 'better-auth/db';

import type { LeadOptions } from './type';

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
        required: false,
        unique: true,
      },
      userId: {
        type: 'string',
        required: false,
        unique: true,
        references: {
          model: 'user',
          field: 'id',
        },
      },
      confirmed: {
        type: 'boolean',
        defaultValue: false,
        required: true,
        input: false,
      },
      confirmationSentAt: {
        type: 'date',
        required: false,
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

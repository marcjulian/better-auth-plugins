import * as z from 'zod';

export const leadMetadataSchema = z
  .object({
    role: z.string().optional(),
    interests: z.array(z.string()).optional(),
  })
  .optional();

export type LeadMetadata = z.infer<typeof leadMetadataSchema>;

import { BASE_ERROR_CODES, type InternalLogger, type StandardSchemaV1 } from 'better-auth';
import { APIError, createAuthEndpoint, createEmailVerificationToken } from 'better-auth/api';
import { jwtVerify } from 'jose';
import type { JWTPayload, JWTVerifyResult } from 'jose';
import { JWTExpired } from 'jose/errors';
import * as z from 'zod';

import { LEAD_ERROR_CODES } from './error-codes';
import type { Lead, LeadOptions, LeadPayload } from './type';

type InferMetadata<O extends LeadOptions> = O extends {
  metadata: { validationSchema: StandardSchemaV1<unknown, infer Out> };
}
  ? Out
  : Record<string, any>;

const subscribeSchema = z.object({
  email: z.string().meta({
    description: 'Email address of the lead',
  }),
  metadata: z.record(z.string(), z.any()).optional().meta({
    description: 'Additional metadata to store with the lead',
  }),
});

export const subscribe = <O extends LeadOptions>(options: O) =>
  createAuthEndpoint(
    '/lead/subscribe',
    {
      method: 'POST',
      body: subscribeSchema,
      metadata: {
        $Infer: {
          body: {} as {
            email: string;
            metadata?: InferMetadata<O>;
          },
        },
      },
    },
    async (ctx) => {
      const { email } = ctx.body;

      const isValidEmail = z.email().safeParse(email);
      if (!isValidEmail.success) {
        throw APIError.from('BAD_REQUEST', LEAD_ERROR_CODES.INVALID_EMAIL);
      }

      const metadata = validateMetadata(
        options,
        ctx.body.metadata as Record<string, any> | undefined,
        ctx.context.logger,
      );

      const normalizedEmail = email.toLowerCase();

      let lead = await ctx.context.adapter.findOne<Lead>({
        model: 'lead',
        where: [
          {
            field: 'email',
            value: normalizedEmail,
          },
        ],
      });

      if (!lead) {
        try {
          lead = await ctx.context.adapter.create<LeadPayload, Lead>({
            model: 'lead',
            data: {
              email: normalizedEmail,
              metadata: metadata ? JSON.stringify(metadata) : undefined,
            },
          });
        } catch (e) {
          ctx.context.logger.info('Error creating lead');
          lead = await ctx.context.adapter.findOne<Lead>({
            model: 'lead',
            where: [
              {
                field: 'email',
                value: normalizedEmail,
              },
            ],
          });
        }
      }

      if (options.sendVerificationEmail && lead && !lead.emailVerified) {
        const token = await createEmailVerificationToken(
          ctx.context.secret,
          normalizedEmail,
          undefined,
          options.expiresIn ?? 3600,
        );
        const url = `${ctx.context.baseURL}/lead/verify?token=${token}`;

        const sent = await options.sendVerificationEmail(
          {
            lead,
            url,
            token,
          },
          ctx.request,
        );

        if (sent) {
          await ctx.context.adapter.update<Lead>({
            model: 'lead',
            where: [{ field: 'email', value: normalizedEmail }],
            update: { verificationEmailSentAt: new Date() },
          });
        }
      }

      return ctx.json({
        status: true,
      });
    },
  );

const verifySchema = z.object({
  token: z.string().meta({
    description: 'The token to verify the email',
  }),
});

export const verify = <O extends LeadOptions>(options: O) =>
  createAuthEndpoint(
    '/lead/verify',
    {
      method: 'GET',
      query: verifySchema,
    },
    async (ctx) => {
      const { token } = ctx.query;

      let jwt: JWTVerifyResult<JWTPayload>;
      try {
        jwt = await jwtVerify(token, new TextEncoder().encode(ctx.context.secret), {
          algorithms: ['HS256'],
        });
      } catch (e) {
        if (e instanceof JWTExpired) {
          throw APIError.from('UNAUTHORIZED', LEAD_ERROR_CODES.TOKEN_EXPIRED);
        }
        throw APIError.from('UNAUTHORIZED', LEAD_ERROR_CODES.INVALID_TOKEN);
      }

      const parsed = subscribeSchema.parse(jwt.payload);

      let lead = await ctx.context.adapter.findOne<Lead>({
        model: 'lead',
        where: [
          {
            field: 'email',
            value: parsed.email,
          },
        ],
      });

      if (!lead) {
        return ctx.json({
          status: true,
        });
      }

      if (lead.emailVerified) {
        return ctx.json({
          status: true,
        });
      }

      lead = await ctx.context.adapter.update<Lead>({
        model: 'lead',
        where: [
          {
            field: 'email',
            value: parsed.email,
          },
        ],
        update: {
          emailVerified: true,
        },
      });

      if (!lead) {
        return ctx.json({
          status: true,
        });
      }

      if (options.onEmailVerified) {
        await ctx.context.runInBackgroundOrAwait(options.onEmailVerified({ lead }, ctx.request));
      }

      return ctx.json({
        status: true,
      });
    },
  );

const unsubscribeSchema = z.object({
  id: z.string().meta({
    description: 'The id of the lead to unsubscribe',
  }),
});

export const unsubscribe = <O extends LeadOptions>(options: O) =>
  createAuthEndpoint(
    '/lead/unsubscribe',
    {
      method: 'POST',
      body: unsubscribeSchema,
    },
    async (ctx) => {
      const { id } = ctx.body;

      const lead = await ctx.context.adapter.findOne<Lead>({
        model: 'lead',
        where: [
          {
            field: 'id',
            value: id,
          },
        ],
      });

      if (!lead) {
        return ctx.json({
          status: true,
        });
      }

      await ctx.context.adapter.delete({
        model: 'lead',
        where: [
          {
            field: 'id',
            value: id,
          },
        ],
      });

      return ctx.json({
        status: true,
      });
    },
  );

const resendSchema = z.object({
  email: z.string().meta({
    description: 'Email address to resend the verification email to',
  }),
});

export const resend = <O extends LeadOptions>(options: O) =>
  createAuthEndpoint(
    '/lead/resend',
    {
      method: 'POST',
      body: resendSchema,
    },
    async (ctx) => {
      const { email } = ctx.body;

      const isValidEmail = z.email().safeParse(email);
      if (!isValidEmail.success) {
        throw APIError.from('BAD_REQUEST', LEAD_ERROR_CODES.INVALID_EMAIL);
      }

      const normalizedEmail = email.toLowerCase();

      const lead = await ctx.context.adapter.findOne<Lead>({
        model: 'lead',
        where: [
          {
            field: 'email',
            value: normalizedEmail,
          },
        ],
      });

      if (!lead) {
        return ctx.json({
          status: true,
        });
      }

      if (options.sendVerificationEmail && lead && !lead.emailVerified) {
        const token = await createEmailVerificationToken(
          ctx.context.secret,
          normalizedEmail,
          undefined,
          options.expiresIn ?? 3600,
        );
        const url = `${ctx.context.baseURL}/lead/verify?token=${token}`;

        const sent = await options.sendVerificationEmail(
          {
            lead,
            url,
            token,
          },
          ctx.request,
        );

        if (sent) {
          await ctx.context.adapter.update<Lead>({
            model: 'lead',
            where: [{ field: 'email', value: normalizedEmail }],
            update: { verificationEmailSentAt: new Date() },
          });
        }
      }

      return ctx.json({
        status: true,
      });
    },
  );

const updateSchema = z.object({
  id: z.string().meta({
    description: 'The id of the lead to update',
  }),
  metadata: z.record(z.string(), z.any()).optional().meta({
    description: 'Additional metadata to store with the lead',
  }),
});

export const update = <O extends LeadOptions>(options: O) =>
  createAuthEndpoint(
    '/lead/update',
    {
      method: 'POST',
      body: updateSchema,
      metadata: {
        $Infer: {
          body: {} as {
            id: string;
            metadata?: InferMetadata<O>;
          },
        },
      },
    },
    async (ctx) => {
      const { id } = ctx.body;

      const lead = await ctx.context.adapter.findOne<Lead>({
        model: 'lead',
        where: [
          {
            field: 'id',
            value: id,
          },
        ],
      });

      if (!lead) {
        return ctx.json({
          status: true,
        });
      }

      const metadata = validateMetadata(
        options,
        ctx.body.metadata as Record<string, any> | undefined,
        ctx.context.logger,
      );

      await ctx.context.adapter.update<Lead>({
        model: 'lead',
        where: [
          {
            field: 'id',
            value: id,
          },
        ],
        update: {
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
      });

      return ctx.json({
        status: true,
      });
    },
  );

function validateMetadata(
  options: LeadOptions,
  metadata: Record<string, any> | undefined,
  logger: InternalLogger,
) {
  if (!metadata || !options.metadata?.validationSchema) {
    return metadata;
  }
  const validationResult = options.metadata.validationSchema['~standard'].validate(metadata);

  if (validationResult instanceof Promise) {
    throw APIError.from('INTERNAL_SERVER_ERROR', BASE_ERROR_CODES.ASYNC_VALIDATION_NOT_SUPPORTED);
  }

  if (validationResult.issues) {
    logger.error('Invalid metadata', validationResult.issues);
    throw APIError.from('BAD_REQUEST', LEAD_ERROR_CODES.INVALID_METADATA);
  }

  return validationResult.value as Record<string, any>;
}

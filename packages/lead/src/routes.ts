import { BASE_ERROR_CODES, type InternalLogger, type StandardSchemaV1 } from 'better-auth';
import {
  APIError,
  createAuthEndpoint,
  getSessionFromCtx,
  sessionMiddleware,
} from 'better-auth/api';
import { SignJWT, jwtVerify } from 'jose';
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

type IdentifierType = 'email' | 'user';

const subscribeSchema = z.object({
  email: z.string().optional().meta({
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
            email?: string;
            metadata?: InferMetadata<O>;
          },
        },
      },
    },
    async (ctx) => {
      const email = ctx.body.email;

      const metadata = validateMetadata(
        options,
        ctx.body.metadata as Record<string, any> | undefined,
        ctx.context.logger,
      );

      let identifierType: IdentifierType;
      let leadIdentifier: string;
      let leadEmail: string;
      let createData: LeadPayload;

      if (email) {
        const isValidEmail = z.email().safeParse(email);
        if (!isValidEmail.success) {
          throw APIError.from('BAD_REQUEST', LEAD_ERROR_CODES.INVALID_EMAIL);
        }

        leadIdentifier = email.toLowerCase();
        identifierType = 'email';
        leadEmail = leadIdentifier;
        createData = {
          email: leadIdentifier,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        };
      } else {
        const session = await getSessionFromCtx(ctx);

        if (!session) {
          throw APIError.from('BAD_REQUEST', LEAD_ERROR_CODES.EMAIL_OR_SESSION_REQUIRED);
        }

        leadIdentifier = session.user.id;
        identifierType = 'user';
        leadEmail = session.user.email;
        createData = {
          userId: leadIdentifier,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        };
      }

      const whereField = identifierType === 'email' ? 'email' : 'userId';

      let lead = await ctx.context.adapter.findOne<Lead>({
        model: 'lead',
        where: [{ field: whereField, value: leadIdentifier }],
      });

      if (!lead) {
        try {
          lead = await ctx.context.adapter.create<LeadPayload, Lead>({
            model: 'lead',
            data: createData,
          });
        } catch (e) {
          ctx.context.logger.info('Error creating lead');
          lead = await ctx.context.adapter.findOne<Lead>({
            model: 'lead',
            where: [{ field: whereField, value: leadIdentifier }],
          });
        }
      }

      if (options.sendConfirmationEmail && lead && !lead.confirmed) {
        const token = await createConfirmationToken(
          ctx.context.secret,
          { identifier: leadIdentifier, type: identifierType },
          options.expiresIn ?? 3600,
        );
        const url = `${ctx.context.baseURL}/lead/verify?token=${token}`;
        const unsubscribeToken = await createUnsubscribeToken(
          ctx.context.secret,
          lead.id,
          options.unsubscribeExpiresIn,
        );
        const unsubscribeUrl = `${ctx.context.baseURL}/lead/unsubscribe?token=${unsubscribeToken}`;

        const sent = await options.sendConfirmationEmail(
          {
            lead,
            email: leadEmail,
            url,
            token,
            unsubscribeUrl,
          },
          ctx.request,
        );

        if (sent) {
          await ctx.context.adapter.update<Lead>({
            model: 'lead',
            where: [{ field: whereField, value: leadIdentifier }],
            update: { confirmationSentAt: new Date() },
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

      const confirmationPayloadSchema = z.object({
        identifier: z.string(),
        type: z.enum(['email', 'user']),
      });
      const parsed = confirmationPayloadSchema.parse(jwt.payload);

      const whereField = parsed.type === 'user' ? 'userId' : 'email';

      let lead = await ctx.context.adapter.findOne<Lead>({
        model: 'lead',
        where: [{ field: whereField, value: parsed.identifier }],
      });

      if (!lead) {
        return ctx.json({
          status: true,
        });
      }

      if (lead.confirmed) {
        return ctx.json({
          status: true,
        });
      }

      lead = await ctx.context.adapter.update<Lead>({
        model: 'lead',
        where: [{ field: whereField, value: parsed.identifier }],
        update: {
          confirmed: true,
        },
      });

      if (!lead) {
        return ctx.json({
          status: true,
        });
      }

      if (options.onConfirmed) {
        await ctx.context.runInBackgroundOrAwait(options.onConfirmed({ lead }, ctx.request));
      }

      return ctx.json({
        status: true,
      });
    },
  );

const unsubscribeQuerySchema = z.object({
  token: z.string().meta({
    description: 'Signed unsubscribe token',
  }),
});

export const unsubscribe = <O extends LeadOptions>(options: O) =>
  createAuthEndpoint(
    '/lead/unsubscribe',
    {
      method: 'POST',
      query: unsubscribeQuerySchema,
      metadata: {
        // Empty array overrides the router-level JSON-only restriction,
        // allowing POST with no body (required for RFC 8058 one-click unsubscribe).
        allowedMediaTypes: [],
      },
    },
    async (ctx) => {
      let payload: JWTPayload;
      try {
        const result = await jwtVerify(
          ctx.query.token,
          new TextEncoder().encode(ctx.context.secret),
          { algorithms: ['HS256'] },
        );
        payload = result.payload;
      } catch (e) {
        if (e instanceof JWTExpired) {
          throw APIError.from('UNAUTHORIZED', LEAD_ERROR_CODES.TOKEN_EXPIRED);
        }
        throw APIError.from('UNAUTHORIZED', LEAD_ERROR_CODES.INVALID_TOKEN);
      }

      const id = payload['id'] as string;

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

export const unsubscribeSession = <O extends LeadOptions>(_options: O) =>
  createAuthEndpoint(
    '/lead/unsubscribe-session',
    {
      method: 'POST',
      use: [sessionMiddleware],
    },
    async (ctx) => {
      const userId = ctx.context.session.user.id;

      const lead = await ctx.context.adapter.findOne<Lead>({
        model: 'lead',
        where: [{ field: 'userId', value: userId }],
      });

      if (!lead) {
        return ctx.json({
          status: true,
        });
      }

      await ctx.context.adapter.delete({
        model: 'lead',
        where: [{ field: 'userId', value: userId }],
      });

      return ctx.json({
        status: true,
      });
    },
  );

const resendSchema = z.object({
  email: z.string().optional().meta({
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
      const email = ctx.body.email;

      let identifierType: IdentifierType;
      let leadIdentifier: string;
      let leadEmail: string;

      if (email) {
        const isValidEmail = z.email().safeParse(email);
        if (!isValidEmail.success) {
          throw APIError.from('BAD_REQUEST', LEAD_ERROR_CODES.INVALID_EMAIL);
        }

        leadIdentifier = email.toLowerCase();
        identifierType = 'email';
        leadEmail = leadIdentifier;
      } else {
        const session = await getSessionFromCtx(ctx);

        if (!session) {
          throw APIError.from('BAD_REQUEST', LEAD_ERROR_CODES.EMAIL_OR_SESSION_REQUIRED);
        }
        leadIdentifier = session.user.id;
        identifierType = 'user';
        leadEmail = session.user.email;
      }

      const whereField = identifierType === 'email' ? 'email' : 'userId';

      const lead = await ctx.context.adapter.findOne<Lead>({
        model: 'lead',
        where: [{ field: whereField, value: leadIdentifier }],
      });

      if (!lead) {
        return ctx.json({
          status: true,
        });
      }

      if (options.sendConfirmationEmail && !lead.confirmed) {
        const token = await createConfirmationToken(
          ctx.context.secret,
          { identifier: leadIdentifier, type: identifierType },
          options.expiresIn ?? 3600,
        );
        const url = `${ctx.context.baseURL}/lead/verify?token=${token}`;
        const unsubscribeToken = await createUnsubscribeToken(
          ctx.context.secret,
          lead.id,
          options.unsubscribeExpiresIn,
        );
        const unsubscribeUrl = `${ctx.context.baseURL}/lead/unsubscribe?token=${unsubscribeToken}`;

        const sent = await options.sendConfirmationEmail(
          {
            lead,
            email: leadEmail,
            url,
            token,
            unsubscribeUrl,
          },
          ctx.request,
        );

        if (sent) {
          await ctx.context.adapter.update<Lead>({
            model: 'lead',
            where: [{ field: whereField, value: leadIdentifier }],
            update: { confirmationSentAt: new Date() },
          });
        }
      }

      return ctx.json({
        status: true,
      });
    },
  );

const updateSchema = z.object({
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
      use: [sessionMiddleware],
      metadata: {
        $Infer: {
          body: {} as {
            metadata?: InferMetadata<O>;
          },
        },
      },
    },
    async (ctx) => {
      const userId = ctx.context.session.user.id;

      const lead = await ctx.context.adapter.findOne<Lead>({
        model: 'lead',
        where: [{ field: 'userId', value: userId }],
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
        where: [{ field: 'userId', value: userId }],
        update: {
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
      });

      return ctx.json({
        status: true,
      });
    },
  );

const listQuerySchema = z.object({
  limit: z.coerce
    .number()
    .meta({
      description: 'The number of lead to return',
    })
    .optional(),
  offset: z.coerce
    .number()
    .meta({
      description: 'The offset to start from',
    })
    .optional(),
});

export const list = <O extends LeadOptions>(options: O) =>
  createAuthEndpoint(
    '/lead/list',
    {
      method: 'GET',
      query: listQuerySchema,
      use: [sessionMiddleware],
    },
    async (ctx) => {
      if (!ctx.context.hasPlugin('admin')) {
        throw APIError.from('NOT_FOUND', LEAD_ERROR_CODES.ADMIN_PLUGIN_REQUIRED);
      }

      const allowedRoles = options.admin?.roles ?? ['admin'];
      const userRole = (ctx.context.session.user as { role?: string }).role ?? '';
      const userRoles = userRole
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      const hasRole = userRoles.some((r) => allowedRoles.includes(r));

      if (!hasRole) {
        throw APIError.from('FORBIDDEN', LEAD_ERROR_CODES.FORBIDDEN);
      }

      const limit = ctx.query.limit ?? 100;
      const offset = ctx.query.offset ?? 0;

      const [leads, total] = await Promise.all([
        ctx.context.adapter.findMany<Lead>({
          model: 'lead',
          limit,
          offset,
        }),
        ctx.context.adapter.count({ model: 'lead' }),
      ]);

      return ctx.json({ leads, total, limit, offset });
    },
  );

async function createConfirmationToken(
  secret: string,
  payload: { identifier: string; type: IdentifierType },
  expiresIn: number,
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(new TextEncoder().encode(secret));
}

async function createUnsubscribeToken(secret: string, leadId: string, expiresIn?: number) {
  const jwt = new SignJWT({ id: leadId }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt();
  if (expiresIn !== undefined) {
    jwt.setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn);
  }
  return jwt.sign(new TextEncoder().encode(secret));
}

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

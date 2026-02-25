import { APIError, createAuthEndpoint, createEmailVerificationToken } from 'better-auth/api';
import * as z from 'zod';
import type { Lead, LeadOptions, LeadPayload } from './type';
import { jwtVerify } from 'jose';
import type { JWTPayload, JWTVerifyResult } from 'jose';
import { JWTExpired } from 'jose/errors';

const subscribeSchema = z.object({
  email: z.email(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const subscribe = <O extends LeadOptions>(options: O) =>
  createAuthEndpoint(
    '/lead/subscribe',
    {
      method: 'POST',
      body: subscribeSchema,
      metadata: {
        // TODO add openapi
      },
    },
    async (ctx) => {
      const { email, metadata } = ctx.body;

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
      } else if (!lead.emailVerified) {
        lead = await ctx.context.adapter.update<Lead>({
          model: 'lead',
          where: [
            {
              field: 'email',
              value: normalizedEmail,
            },
          ],
          update: {
            metadata: metadata ? JSON.stringify(metadata) : lead.metadata,
          },
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

        await ctx.context.runInBackgroundOrAwait(
          options.sendVerificationEmail({ email: normalizedEmail, url, token }, ctx.request),
        );
      }

      return ctx.json({
        status: true,
      });
    },
  );

const verifySchema = z.object({
  token: z.string(),
});

export const verify = <O extends LeadOptions>(options: O) =>
  createAuthEndpoint(
    '/lead/verify',
    {
      method: 'GET',
      query: verifySchema,
      metadata: {
        // TODO add openapi
      },
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
          throw new APIError('UNAUTHORIZED', {
            message: 'Token expired',
          });
        }
        throw new APIError('UNAUTHORIZED', {
          message: 'Invalid token',
        });
      }

      const parsed = subscribeSchema.parse(jwt.payload);

      const lead = await ctx.context.adapter.findOne<Lead>({
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

      await ctx.context.adapter.update<Lead>({
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

      return ctx.json({
        status: true,
      });
    },
  );

const unsubscribeSchema = z.object({
  id: z.string(),
});

export const unsubscribe = <O extends LeadOptions>(options: O) =>
  createAuthEndpoint(
    '/lead/unsubscribe',
    {
      method: 'POST',
      body: unsubscribeSchema,
      metadata: {
        // TODO add openapi
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
  email: z.email(),
});

export const resend = <O extends LeadOptions>(options: O) =>
  createAuthEndpoint(
    '/lead/resend',
    {
      method: 'POST',
      body: resendSchema,
      metadata: {
        // TODO add openapi
      },
    },
    async (ctx) => {
      const { email } = ctx.body;

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

        await ctx.context.runInBackgroundOrAwait(
          options.sendVerificationEmail({ email: normalizedEmail, url, token }, ctx.request),
        );
      }

      return ctx.json({
        status: true,
      });
    },
  );

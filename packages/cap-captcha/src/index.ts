import type { BetterAuthPlugin } from 'better-auth';

import { cap } from './cap';
import { defaultEndpoints } from './constants';
import { EXTERNAL_ERROR_CODES } from './error-codes';
import { middlewareResponse } from './middleware-response';
import type { CapOptions } from './types';
import { PACKAGE_VERSION } from './version';

declare module 'better-auth' {
  interface BetterAuthPluginRegistry<AuthOptions, Options> {
    'cap-captcha': {
      creator: typeof capCaptcha;
    };
  }
}

export type * from './types';

export const capCaptcha = (options: CapOptions) =>
  ({
    id: 'cap-captcha',
    version: PACKAGE_VERSION,
    $ERROR_CODES: EXTERNAL_ERROR_CODES,
    onRequest: async (request, ctx) => {
      try {
        const endpoints = options.endpoints?.length ? options.endpoints : defaultEndpoints;

        const url = new URL(request.url);
        const basePath = ctx.options.basePath ?? '/api/auth';
        let pathname = url.pathname.replace(basePath, '');

        if (pathname.endsWith('//')) pathname = pathname.slice(0, -1);
        if (pathname.startsWith('//')) pathname = pathname.slice(1);
        if (!pathname.startsWith('/')) pathname = '/' + pathname;

        const exemptPaths = ['/sign-in/email-otp'].reduce<string[]>((acc, curr) => {
          if (options.endpoints?.length && options.endpoints.includes(curr)) {
            return acc;
          }
          return [...acc, curr];
        }, []);
        const match = endpoints.some((endpoint) => {
          return pathname.includes(endpoint) && !exemptPaths.some((p) => pathname.includes(p));
        });

        if (!match) {
          return undefined;
        }

        const captchaResponse = request.headers.get('x-captcha-response');

        if (!captchaResponse) {
          return middlewareResponse({
            message: EXTERNAL_ERROR_CODES.MISSING_RESPONSE.message,
            code: EXTERNAL_ERROR_CODES.MISSING_RESPONSE.code,
            status: 400,
          });
        }

        const siteKey = captchaResponse.split(':')[0];
        const secretKey = options.siteKeys[siteKey];

        if (!secretKey) {
          return middlewareResponse({
            message: EXTERNAL_ERROR_CODES.VERIFICATION_FAILED.message,
            code: EXTERNAL_ERROR_CODES.VERIFICATION_FAILED.code,
            status: 403,
          });
        }

        return await cap({
          providerUrl: options.providerUrl,
          secretKey,
          captchaResponse,
        });
      } catch (_error) {
        const errorMessage = _error instanceof Error ? _error.message : undefined;

        ctx.logger.error(errorMessage ?? 'Unknown error', {
          endpoint: request.url,
          message: _error,
        });

        return middlewareResponse({
          message: EXTERNAL_ERROR_CODES.UNKNOWN_ERROR.message,
          code: EXTERNAL_ERROR_CODES.UNKNOWN_ERROR.code,
          status: 500,
        });
      }
    },
    options,
  }) satisfies BetterAuthPlugin;

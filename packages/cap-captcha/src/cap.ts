import { betterFetch } from 'better-auth/client';

import { middlewareResponse } from './middleware-response';
import { CAPTCHA_VERIFY_TIMEOUT_MS } from './constants';
import { EXTERNAL_ERROR_CODES, INTERNAL_ERROR_CODES } from './error-codes';

type Params = {
  providerUrl: string;
  secretKey: string;
  captchaResponse: string;
};

type SiteVerifyResponse = {
  success: boolean;
};

export const cap = async ({
  providerUrl,
  secretKey,
  captchaResponse,
}: Params) => {
  const response = await betterFetch<SiteVerifyResponse>(
    `${providerUrl.replace(/\/+$/, '')}/siteverify`,
    {
      method: 'POST',
      timeout: CAPTCHA_VERIFY_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretKey,
        response: captchaResponse,
      }),
    },
  );

  if (!response.data || response.error) {
    throw new Error(INTERNAL_ERROR_CODES.SERVICE_UNAVAILABLE.message);
  }

  if (!response.data.success) {
    return middlewareResponse({
      message: EXTERNAL_ERROR_CODES.VERIFICATION_FAILED.message,
      code: EXTERNAL_ERROR_CODES.VERIFICATION_FAILED.code,
      status: 403,
    });
  }

  return undefined;
};

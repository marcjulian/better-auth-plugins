import { CAPTCHA_VERIFY_TIMEOUT_MS } from './constants';
import { EXTERNAL_ERROR_CODES, INTERNAL_ERROR_CODES } from './error-codes';
import { middlewareResponse } from './middleware-response';

type Params = {
  providerUrl: string;
  secretKey: string;
  captchaResponse: string;
};

type SiteVerifyResponse = {
  success: boolean;
};

export const cap = async ({ providerUrl, secretKey, captchaResponse }: Params) => {
  let response: Response;
  try {
    response = await fetch(`${providerUrl.replace(/\/+$/, '')}/siteverify`, {
      method: 'POST',
      signal: AbortSignal.timeout(CAPTCHA_VERIFY_TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretKey,
        response: captchaResponse,
      }),
    });
  } catch {
    throw new Error(INTERNAL_ERROR_CODES.SERVICE_UNAVAILABLE.message);
  }

  if (!response.ok) {
    throw new Error(INTERNAL_ERROR_CODES.SERVICE_UNAVAILABLE.message);
  }

  let data: SiteVerifyResponse;
  try {
    data = (await response.json()) as SiteVerifyResponse;
  } catch {
    throw new Error(INTERNAL_ERROR_CODES.SERVICE_UNAVAILABLE.message);
  }

  if (!data.success) {
    return middlewareResponse({
      message: EXTERNAL_ERROR_CODES.VERIFICATION_FAILED.message,
      code: EXTERNAL_ERROR_CODES.VERIFICATION_FAILED.code,
      status: 403,
    });
  }

  return undefined;
};

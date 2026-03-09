import { defineErrorCodes } from 'better-auth';

export const LEAD_ERROR_CODES = defineErrorCodes({
  INVALID_EMAIL: 'Invalid email',
  INVALID_TOKEN: 'Invalid token',
  TOKEN_EXPIRED: 'Token expired',
  INVALID_METADATA: 'Invalid metadata',
});

import { defineErrorCodes } from 'better-auth';

export const LEAD_ERROR_CODES = defineErrorCodes({
  INVALID_EMAIL: 'Invalid email',
  INVALID_TOKEN: 'Invalid token',
  TOKEN_EXPIRED: 'Token expired',
  INVALID_METADATA: 'Invalid metadata',
  EMAIL_OR_SESSION_REQUIRED: 'Email or session is required',
  ADMIN_PLUGIN_REQUIRED: 'Admin plugin is required',
  FORBIDDEN: 'Forbidden',
  LEAD_NOT_FOUND: 'Lead not found',
});

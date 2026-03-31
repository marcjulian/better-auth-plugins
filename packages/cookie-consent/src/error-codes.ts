import { defineErrorCodes } from 'better-auth';

export const COOKIE_CONSENT_ERROR_CODES = defineErrorCodes({
  MISSING_ANONYMOUS_ID: 'Anonymous ID is required',
  CONSENT_NOT_FOUND: 'Cookie consent record not found',
  INVALID_CONSENT: 'Consent must be a non-empty object with boolean values',
  VERSION_MISMATCH: 'Consent version is outdated and must be renewed',
});

/**
 * Upper bound (in milliseconds) for a single provider verification request.
 * Without it, a hanging provider would tie up the request indefinitely before
 * any rate limiting applies, so every verify handler aborts at this deadline
 * and fails closed.
 */
export const CAPTCHA_VERIFY_TIMEOUT_MS = 10_000;

export const defaultEndpoints = ['/sign-up/email', '/sign-in/email', '/request-password-reset'];

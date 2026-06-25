export interface CapOptions {
  /**
   * URL of your Cap instance, e.g. `https://cap.example.com`.
   * Do not include the site key here — it is extracted from the token.
   */
  providerUrl: string;
  /**
   * Map of site keys to their secret keys. The site key is extracted from
   * the `x-captcha-response` token (format: `siteKey:...:...`), so the
   * frontend widget determines which entry is used.
   */
  siteKeys: Record<string, string>;
  /**
   * Auth endpoints to protect. Defaults to sign-up (email), sign-in (email),
   * and request-password-reset.
   */
  endpoints?: string[] | undefined;
}

import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, inject, PLATFORM_ID, REQUEST } from '@angular/core';

const ANONYMOUS_ID_COOKIE = 'cookie-consent-anon-id';

/**
 * Parse a single cookie value from a raw cookie header string.
 */
export function parseCookie(cookieStr: string | undefined, name: string): string | undefined {
  if (!cookieStr) return undefined;
  for (const pair of cookieStr.split('; ')) {
    const [key, ...valueParts] = pair.split('=');
    if (key === name && valueParts.length > 0) {
      try {
        return decodeURIComponent(valueParts.join('='));
      } catch {
        return valueParts.join('=');
      }
    }
  }
  return undefined;
}

/**
 * Injectable helper for reading the anonymous consent cookie.
 * Uses `document.cookie` in the browser and `injectRequest()` during SSR.
 * Must be called inside an injection context (constructor or field initializer).
 */
export function injectAnonymousId() {
  const platformId = inject(PLATFORM_ID);
  // const document = inject(DOCUMENT);
  const request = inject(REQUEST, { optional: true });

  return {
    get(): string | null {
      if (isPlatformBrowser(platformId)) {
        return parseCookie(document.cookie, ANONYMOUS_ID_COOKIE) ?? null;
      }
      return parseCookie(request?.headers.get('cookie') ?? undefined, ANONYMOUS_ID_COOKIE) ?? null;
    },

    /**
     * Write a specific anonymous ID into the browser cookie.
     * Useful for persisting the server-returned ID so consent survives logout.
     */
    set(id: string): void {
      if (isPlatformBrowser(platformId)) {
        document.cookie = `${ANONYMOUS_ID_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`;
      }
    },

    getOrCreate(): string {
      let id = this.get();
      if (!id) {
        id = crypto.randomUUID();
      }
      if (isPlatformBrowser(platformId)) {
        document.cookie = `${ANONYMOUS_ID_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`;
      }
      return id;
    },
  };
}

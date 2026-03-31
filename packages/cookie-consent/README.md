# better-auth-cookie-consent

GDPR-compliant cookie consent management plugin for [Better Auth](https://better-auth.com/).

- Store and manage user cookie consent
- Works for both anonymous and authenticated users
- Merges anonymous consent on login
- Consent versioning with automatic invalidation
- Client plugin with local state management

## Installation

```bash
# npm
npm install better-auth-cookie-consent

# pnpm
pnpm add better-auth-cookie-consent
```

## Server Setup

```ts
import { betterAuth } from 'better-auth';
import { cookieConsentPlugin } from 'better-auth-cookie-consent';

export const auth = betterAuth({
  // ... your config
  plugins: [
    cookieConsentPlugin({
      consentVersion: 'v1',
      onConsentChange: async ({ consent }) => {
        console.log('Consent changed:', consent);
      },
    }),
  ],
});
```

### Plugin Options

| Option           | Type       | Default | Description                                |
| ---------------- | ---------- | ------- | ------------------------------------------ |
| consentVersion   | `string`   | `"v1"`  | Current consent policy version             |
| onConsentChange  | `function` | —       | Callback when consent is created/updated   |
| rateLimit        | `object`   | —       | Rate limit for set/merge endpoints         |
| schema           | `object`   | —       | Schema overrides for the cookieConsent table |

## Client Setup

```ts
import { createAuthClient } from 'better-auth/client';
import { cookieConsentClient } from 'better-auth-cookie-consent/client';

export const authClient = createAuthClient({
  plugins: [cookieConsentClient()],
});
```

## Usage

### Set Consent

```ts
await authClient.cookieConsent.setConsent({
  anonymousId: 'anon-123',
  consent: {
    analytics: true,
    marketing: false,
    functional: true,
  },
  consentVersion: 'v1',
});
```

### Get Consent

```ts
const { data } = await authClient.cookieConsent.getConsent('anon-123');
// data.consent — the consent record (or null)
// data.versionMatch — whether stored version matches current
```

### Accept All

```ts
await authClient.cookieConsent.acceptAll({
  anonymousId: 'anon-123',
  categories: ['analytics', 'marketing', 'functional'],
  consentVersion: 'v1',
});
```

### Reject All

```ts
await authClient.cookieConsent.rejectAll({
  anonymousId: 'anon-123',
  categories: ['analytics', 'marketing', 'functional'],
  consentVersion: 'v1',
});
```

### Update Preferences

```ts
await authClient.cookieConsent.updatePreferences({
  anonymousId: 'anon-123',
  consent: { analytics: true, marketing: false, functional: true },
  consentVersion: 'v1',
});
```

### Merge Anonymous Consent After Login

```ts
await authClient.cookieConsent.mergeConsent('anon-123');
```

## Server-Side Helpers

```ts
import { getConsentFromCtx, hasConsent } from 'better-auth-cookie-consent';

// Inside an endpoint handler:
const record = await getConsentFromCtx(ctx);

if (await hasConsent(ctx, 'analytics')) {
  // tracking is allowed
}
```

## API Endpoints

| Method | Path                    | Description                        |
| ------ | ----------------------- | ---------------------------------- |
| POST   | `/cookie-consent/set`   | Create or update consent           |
| GET    | `/cookie-consent/get`   | Retrieve consent                   |
| POST   | `/cookie-consent/merge` | Merge anonymous consent to user    |

## Consent Versioning

When the `consentVersion` option changes, the `getConsent` endpoint returns `versionMatch: false` so the client knows to prompt for re-consent.

## Database Schema

The plugin creates a `cookieConsent` table:

| Column         | Type     | Description                        |
| -------------- | -------- | ---------------------------------- |
| id             | string   | Primary key                        |
| userId         | string?  | References user table              |
| anonymousId    | string   | Anonymous client identifier        |
| consent        | string   | JSON-encoded consent preferences   |
| consentVersion | string   | Consent policy version             |
| timestamp      | date     | When consent was recorded          |

### Prisma Schema

```prisma
model CookieConsent {
  id             String   @id @default(cuid())
  userId         String?
  anonymousId    String
  consent        String
  consentVersion String
  timestamp      DateTime @default(now())
  user           User?    @relation(fields: [userId], references: [id])
}
```

## License

MIT

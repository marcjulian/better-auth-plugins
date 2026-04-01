# better-auth-cookie-consent

GDPR-compliant cookie consent management plugin for [Better Auth](https://better-auth.com/).

- Store and manage user cookie consent preferences
- Works for both anonymous and authenticated users
- Automatic merge of anonymous consent on sign-in / sign-up
- Consent versioning with automatic invalidation
- Validation schema support (e.g. Zod) to enforce consent shape
- Client plugin with local state management via nanostores
- Dedicated `acceptAll` / `rejectAll` endpoints — categories derived from the validation schema

## How It Works

### Anonymous User Flow

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  User visits site │────▶│ Cookie banner shown  │────▶│ User accepts/    │
│  (no session,     │     │ (no server call if   │     │ rejects/         │
│   no anonId)      │     │  no anonId cookie)   │     │ customizes       │
└──────────────────┘     └─────────────────────┘     └────────┬─────────┘
                                                              │
                                                              ▼
                                                    ┌──────────────────┐
                                                    │ Server stores     │
                                                    │ consent with      │
                                                    │ anonymousId       │
                                                    │ (cookie set on    │
                                                    │  browser)         │
                                                    └──────────────────┘
```

### Sign-In / Sign-Up Merge Flow

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│ Anonymous user    │────▶│ User signs in or     │────▶│ Server hook reads│
│ has given consent │     │ signs up             │     │ anonId from      │
│ (anonId cookie    │     │                      │     │ cookie & merges  │
│  is set)          │     │                      │     │ consent to user  │
└──────────────────┘     └─────────────────────┘     └────────┬─────────┘
                                                              │
                                                              ▼
                                                    ┌──────────────────┐
                                                    │ Consent now tied  │
                                                    │ to userId —       │
                                                    │ persists across   │
                                                    │ devices/sessions  │
                                                    └──────────────────┘
```

### Session-Aware Banner Flow

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│ Banner visible    │────▶│ User logs in         │────▶│ Client detects   │
│ (no consent)      │     │                      │     │ session change   │
│                   │     │                      │     │ (null → session) │
└──────────────────┘     └─────────────────────┘     └────────┬─────────┘
                                                              │
                                                              ▼
                                                    ┌──────────────────┐
                                                    │ Fetches consent   │
                                                    │ from server →     │
                                                    │ hides banner,     │
                                                    │ persists anonId   │
                                                    │ cookie for logout │
                                                    └──────────────────┘
```

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
import { cookieConsentPlugin, defaultConsentSchema } from 'better-auth-cookie-consent';

export const auth = betterAuth({
  // ... your config
  plugins: [
    cookieConsentPlugin({
      consentVersion: 'v1',
      consent: { validationSchema: defaultConsentSchema },
      onConsentChange: async ({ consent }) => {
        console.log('Consent changed:', consent);
      },
    }),
  ],
});
```

### Plugin Options

| Option           | Type                | Default | Description                                |
| ---------------- | ------------------- | ------- | ------------------------------------------ |
| consentVersion   | `string`            | `"v1"`  | Current consent policy version             |
| consent.validationSchema | `StandardSchemaV1` | — | Schema to validate consent (e.g. Zod object) |
| onConsentChange  | `function`          | —       | Callback when consent is created/updated   |
| rateLimit        | `object`            | —       | Rate limit for set/merge/accept/reject endpoints |
| schema           | `object`            | —       | Schema overrides for the cookieConsent table |

### Validation Schema

The plugin validates consent JSON against a `StandardSchemaV1` (e.g. Zod schema) on every write. A preset `defaultConsentSchema` is exported for the standard categories:

```ts
import { defaultConsentSchema } from 'better-auth-cookie-consent';

// Equivalent to:
// z.object({
//   necessary: z.boolean(),
//   analytics: z.boolean(),
//   marketing: z.boolean(),
//   functional: z.boolean(),
// })
```

The `acceptAll` and `rejectAll` endpoints derive their category keys from this schema automatically — no need to pass categories from the client.

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
    necessary: true,
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

Categories are derived from the server's validation schema:

```ts
await authClient.cookieConsent.acceptAll({
  anonymousId: 'anon-123',
  consentVersion: 'v1',
});
```

### Reject All

Categories are derived from the server's validation schema:

```ts
await authClient.cookieConsent.rejectAll({
  anonymousId: 'anon-123',
  consentVersion: 'v1',
});
```

### Update Preferences

```ts
await authClient.cookieConsent.updatePreferences({
  anonymousId: 'anon-123',
  consent: { necessary: true, analytics: true, marketing: false, functional: true },
  consentVersion: 'v1',
});
```

### Merge Anonymous Consent After Login

```ts
await authClient.cookieConsent.mergeConsent('anon-123');
```

> **Note:** Manual merging is typically unnecessary — the plugin automatically merges anonymous consent when a user signs in or signs up via server-side hooks.

## Cookie Banner — What You Need to Handle

The plugin provides the server and client APIs but **does not include a cookie banner UI**. You need to implement the banner in your application. Here's what the banner should handle:

### 1. Anonymous ID Management

Store a unique anonymous ID in a cookie named `cookie-consent-anon-id`. This cookie must be:
- Created when the user first interacts with the banner (e.g. `crypto.randomUUID()`)
- Sent as a standard browser cookie so the server can read it during sign-in/sign-up hooks
- Readable via SSR (e.g. `injectRequest()` in Analog.js)

```ts
// Set the anonymous ID cookie
document.cookie = `cookie-consent-anon-id=${id}; path=/; max-age=31536000; SameSite=Lax`;
```

### 2. Banner Visibility Logic

```
On page load:
  IF anonId cookie exists OR user is logged in:
    → Fetch consent from server (GET /cookie-consent/get)
    → If consent exists and version matches → hide banner
    → Otherwise → show banner
  ELSE:
    → Show banner immediately (no server call needed)
```

### 3. Session Change Detection

Subscribe to the auth client's session state. When the session transitions from `null` → logged-in:
1. Fetch consent from the server
2. If consent exists, hide the banner and persist the `anonymousId` cookie
3. This ensures the banner disappears immediately on login without a page reload
4. The persisted `anonymousId` ensures consent is still found after logout + page reload

### 4. Accept / Reject / Customize

- **Accept All**: Call `authClient.cookieConsent.acceptAll({ anonymousId, consentVersion })`
- **Reject All**: Call `authClient.cookieConsent.rejectAll({ anonymousId, consentVersion })`
- **Custom**: Call `authClient.cookieConsent.setConsent({ anonymousId, consent, consentVersion })`

### 5. Re-open Banner

After consent is recorded, provide a way for users to manage their preferences (e.g. a "Manage Cookies" link in the footer).

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

| Method | Path                          | Description                                 |
| ------ | ----------------------------- | ------------------------------------------- |
| POST   | `/cookie-consent/set`         | Create or update consent with custom values |
| GET    | `/cookie-consent/get`         | Retrieve consent                            |
| POST   | `/cookie-consent/accept-all`  | Accept all categories (from schema)         |
| POST   | `/cookie-consent/reject-all`  | Reject all categories (from schema)         |
| POST   | `/cookie-consent/merge`       | Merge anonymous consent to user             |

## Auto-Merge on Sign-In / Sign-Up

The plugin registers a server-side `after` hook that runs on every `sign-in/*` and `sign-up/*` path. When the `cookie-consent-anon-id` cookie is present in the request, the hook automatically merges the anonymous consent record to the newly authenticated user. This covers all auth methods (email, social, biometrics, passkey, etc.).

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

# better-auth-cookie-consent

GDPR-compliant cookie consent management plugin for [Better Auth](https://better-auth.com/).

- Store and manage user cookie consent preferences
- Works for both anonymous and authenticated users
- Automatic merge of anonymous consent on sign-in / sign-up
- Consent versioning with automatic invalidation
- Validation schema support (e.g. Zod) to enforce consent shape
- Generic client plugin — `cookieConsentClient<z.infer<typeof schema>>()` types your consent model end-to-end

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
                                                    │ Client calls      │
                                                    │ setConsent with   │
                                                    │ typed consent     │
                                                    │ object → server   │
                                                    │ stores it         │
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
| rateLimit        | `object`            | —       | Rate limit for set/merge endpoints         |
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

## Client Setup

The client plugin accepts a generic type parameter for the consent shape. Use `z.infer<typeof schema>` to get full end-to-end typing:

```ts
import { createAuthClient } from 'better-auth/client';
import { defaultConsentSchema } from 'better-auth-cookie-consent';
import { cookieConsentClient } from 'better-auth-cookie-consent/client';
import type { z } from 'zod';

type ConsentModel = z.infer<typeof defaultConsentSchema>;
// { necessary: boolean; analytics: boolean; marketing: boolean; functional: boolean }

export const authClient = createAuthClient({
  plugins: [cookieConsentClient<ConsentModel>()],
});
```

This types `setConsent`, `getConsent`, and the nanostore atom so that your consent object is fully checked at compile time.

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

### Accept All / Reject All

Build the consent object on the client and call `setConsent`:

```ts
// Accept all
await authClient.cookieConsent.setConsent({
  anonymousId: 'anon-123',
  consent: { necessary: true, analytics: true, marketing: true, functional: true },
  consentVersion: 'v1',
});

// Reject all (keep necessary)
await authClient.cookieConsent.setConsent({
  anonymousId: 'anon-123',
  consent: { necessary: true, analytics: false, marketing: false, functional: false },
  consentVersion: 'v1',
});
```

### Get Consent

```ts
const { data } = await authClient.cookieConsent.getConsent('anon-123');
// data.consent — the consent record (or null)
// data.versionMatch — whether stored version matches current
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

All actions use the `setConsent` endpoint — the client builds the consent object:

- **Accept All**: Build `{ necessary: true, analytics: true, ... }` and call `setConsent`
- **Reject All**: Build `{ necessary: true, analytics: false, ... }` and call `setConsent`
- **Custom**: Use form values and call `setConsent`

The consent object is validated against the server's `validationSchema` on every write.

### 5. Typing Categories

Use `keyof` on the inferred consent model to type your banner categories:

```ts
import type { z } from 'zod';
import { defaultConsentSchema } from 'better-auth-cookie-consent';

type ConsentModel = z.infer<typeof defaultConsentSchema>;
type CategoryId = keyof ConsentModel;

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'necessary', label: 'Necessary' },
  { id: 'analytics', label: 'Analytics' },
  // TypeScript enforces that id must be a valid consent category
];
```

### 6. Re-open Banner

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

| Method | Path                    | Description                                 |
| ------ | ----------------------- | ------------------------------------------- |
| POST   | `/cookie-consent/set`   | Create or update consent                    |
| GET    | `/cookie-consent/get`   | Retrieve consent                            |
| POST   | `/cookie-consent/merge` | Merge anonymous consent to user             |

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

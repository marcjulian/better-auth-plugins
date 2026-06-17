# better-auth-lead

Better Auth plugin to add lead table and API for newsletter/waitlist functionality.

## Installation

```bash
# npm
npm install better-auth-lead
# pnpm
pnpm add better-auth-lead
# yarn
yarn add better-auth-lead
# bun
bun add better-auth-lead
```

Add the plugin to your auth config

```ts
// server/auth.ts
import { createBetterAuth } from '@better-auth/core';
import { lead } from 'better-auth-lead';

const betterAuth = createBetterAuth({
  plugins: [lead()],
});
```

Run better auth migration to create the lead table:

```bash
# npm
npx auth@latest generate
# pnpm
pnpm dlx auth@latest generate
# yarn
yarn dlx auth@latest generate
# bun
bun x auth@latest generate
```

Add the lead plugin to your auth client:

```ts
// client/auth-client.ts
import { createAuthClient } from 'better-auth/client';
import { leadClient } from 'better-auth-lead/client';

const authClient = createAuthClient({
  plugins: [leadClient()],
});
```

## Usage

### Subscribe

Provide an `email` to subscribe an anonymous lead:

```ts
// POST /lead/subscribe
const { data, error } = await authClient.lead.subscribe({
  email: 'user@example.com',
  // json object
  metadata: {
    preferences: 'engineering',
  },
});
```

Or omit `email` to subscribe the currently authenticated user. The lead is associated to the session user's `id` (a valid session cookie is required):

```ts
// POST /lead/subscribe
const { data, error } = await authClient.lead.subscribe({
  metadata: {
    preferences: 'engineering',
  },
});
```

If neither `email` nor an active session is provided, the endpoint responds with `400 Bad Request` (`EMAIL_OR_SESSION_REQUIRED`).

### Verify

```ts
// GET /lead/verify
await authClient.lead.verify({
  query: {
    token,
  },
});
```

### Unsubscribe

The unsubscribe endpoint is designed for [RFC 8058](https://www.rfc-editor.org/rfc/rfc8058) one-click unsubscribe. The signed `token` is embedded in the `unsubscribeUrl` provided to `sendConfirmationEmail` and should be used in `List-Unsubscribe` email headers — email clients (Gmail, Apple Mail, Yahoo Mail) will POST to this URL automatically when the user clicks "Unsubscribe".

```ts
// POST /lead/unsubscribe?token=<signed-token>
const { data, error } = await authClient.lead.unsubscribe({
  query: { token },
});
```

For an authenticated user (e.g. from a "Manage preferences" page in your app), use the session-based endpoint. It requires a valid session and deletes the lead associated with the session user's `id`:

```ts
// POST /lead/unsubscribe-session
const { data, error } = await authClient.lead.unsubscribeSession();
```

### Resend

Resend the confirmation email by `email`:

```ts
// POST /lead/resend
const { data, error } = await authClient.lead.resend({
  email: 'user@example.com',
});
```

Or omit `email` to resend for the currently authenticated user (lead is looked up by the session user's `id`):

```ts
// POST /lead/resend
const { data, error } = await authClient.lead.resend();
```

If neither `email` nor an active session is provided, the endpoint responds with `400 Bad Request` (`EMAIL_OR_SESSION_REQUIRED`).

### Update

Update the metadata of the lead associated with the currently authenticated user. Requires a valid session — the lead is looked up by the session user's `id`:

```ts
// POST /lead/update
const { data, error } = await authClient.lead.update({
  metadata: {
    preferences: 'ai',
  },
});
```

If no session is present the endpoint responds with `401 Unauthorized`.

### List (admin)

Optional admin endpoint to list all leads. Requires the better-auth [`admin`](https://www.better-auth.com/docs/plugins/admin) plugin to be registered, and must be opted in via `admin.enabled`:

```ts
// server/auth.ts
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { lead } from 'better-auth-lead';

export const auth = betterAuth({
  plugins: [
    admin(),
    lead({
      admin: {
        enabled: true,
        // Optional. Roles allowed to call /lead/list. Default: ['admin'].
        // Checked against session.user.role (admin plugin supports
        // comma-separated roles).
        roles: ['admin', 'editor'],
      },
    }),
  ],
});
```

```ts
// GET /lead/list?limit=100&offset=0
const { data, error } = await authClient.lead.list({
  query: {
    limit: 100, // optional, default 100, max 1000
    offset: 0, // optional, default 0
  },
});
```

The response includes the page of `leads`, the `total` number of leads in the database, and the resolved `limit` and `offset` for client-side pagination.

Responses:

- `404 Not Found` (`ADMIN_PLUGIN_REQUIRED`) if the admin plugin is not registered.
- `403 Forbidden` (`FORBIDDEN`) if the session user's role is not in `admin.roles`.
- `401 Unauthorized` if no session is present.

### Email Confirmation

To enable double opt-in email confirmation, pass a `sendConfirmationEmail` function. It receives a data object with:

- `lead`: The lead object.
- `email`: The lead's email address.
- `url`: The URL containing the confirmation token to send to the user.
- `token`: The confirmation token used to complete the verification.
- `unsubscribeUrl`: The endpoint URL for one-click unsubscribe (RFC 8058). Use this in `List-Unsubscribe` email headers.

and a `request` object as the second parameter.

```ts
// server/auth.ts
import { betterAuth } from 'better-auth';
import { lead } from 'better-auth-lead';
import { sendEmail } from './email'; // your email sending function

export const auth = betterAuth({
  plugins: [
    lead({
      sendConfirmationEmail: async ({ lead, email, url, token, unsubscribeUrl }) => {
        const { confirmationSentAt } = lead;
        if (
          confirmationSentAt &&
          Date.now() - confirmationSentAt.getTime() < 60 * 1000 // 1 minute
        ) {
          console.log(
            `Skipping sending confirmation email to ${email} because a recent email was already sent.`,
          );
          return false;
        }

        void sendEmail({
          to: email,
          subject: 'Newsletter: Confirm your subscription',
          text: `Click the link to confirm your subscription: ${url}`,
          // One-click unsubscribe headers (RFC 8058)
          // Supported by Gmail, Apple Mail, and Yahoo Mail.
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        });

        return true;
      },
      onConfirmed: async ({ lead }) => {
        // do something when a lead confirms their subscription
        console.log(`Lead ${lead} has confirmed their subscription!`);
      },
    }),
  ],
});
```

> Avoid awaiting the email sending to prevent timing attacks.

Additionally, you can provide an `onConfirmed` callback to execute logic after a lead confirms their subscription.

### Metadata Validation

To validate and parse metadata, pass a Standard Schema compatible schema (e.g. Zod, Valibot, ArkType) to the `metadata.validationSchema` option. If validation fails, `subscribe` and `update` return a `400 Bad Request` with `INVALID_METADATA`.

To share the type with the client without bundling server code, define the schema in a shared file and import only the type on the client side:

```ts
// shared/lead-metadata-schema.ts
import * as z from 'zod';

export const leadMetadataSchema = z.object({
  preferences: z.enum(['engineering', 'marketing', 'design']),
});

export type LeadMetadata = z.infer<typeof leadMetadataSchema>;
```

```ts
// server/auth.ts
import { betterAuth } from 'better-auth';
import { lead } from 'better-auth-lead';
import { leadMetadataSchema } from './shared/lead-metadata-schema';

export const auth = betterAuth({
  plugins: [
    lead({
      metadata: {
        validationSchema: leadMetadataSchema,
      },
    }),
  ],
});
```

```ts
// client/auth-client.ts
import { createAuthClient } from 'better-auth/client';
import { leadClient } from 'better-auth-lead/client';
import type { LeadMetadata } from './shared/lead-metadata-schema';

const authClient = createAuthClient({
  plugins: [leadClient<LeadMetadata>()],
});

// metadata is now typed as LeadMetadata
await authClient.lead.subscribe({
  email: 'user@example.com',
  metadata: { preferences: 'engineering' },
});

// or for the currently authenticated user (omit email)
await authClient.lead.subscribe({
  metadata: { preferences: 'engineering' },
});
```

## Schema

### Lead

Table name: `lead`

| Field              | Type    | Key    | Description                                       |
| ------------------ | ------- | ------ | ------------------------------------------------- |
| id                 | string  | pk     | Unique identifier for each lead                   |
| email              | string? | unique | Email address of the lead (optional)              |
| userId             | string? | unique | ID of an associated better-auth user (optional)   |
| confirmed          | boolean |        | Whether the lead has confirmed their subscription |
| confirmationSentAt | Date    | ?      | Timestamp of when the confirmation email was sent |
| metadata           | json    | ?      | Additional data about the lead                    |
| createdAt          | date    |        | Timestamp of lead creation                        |
| updatedAt          | date    |        | Timestamp of last update                          |

#### Prisma

```prisma
model Lead {
  id                 String    @id
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  email              String?
  userId             String?
  user               User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  confirmed          Boolean   @default(false)
  confirmationSentAt DateTime?
  metadata           String?

  @@unique([email])
  @@unique([userId])
  @@map("lead")
}
```

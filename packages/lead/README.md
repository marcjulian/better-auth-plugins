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

```ts
// POST /lead/unsubscribe
const { data, error } = await authClient.lead.unsubscribe({ id: 'lead-id' });
```

### Resend

```ts
// POST /lead/resend
const { data, error } = await authClient.lead.resend({
  email: 'user@example.com',
});
```

### Update

```ts
// POST /lead/update
const { data, error } = await authClient.lead.update({
  id: 'lead-id',
  metadata: {
    preferences: 'ai',
  },
});
```

### Email Verification

To enable email verification, you need to pass a function that sends a verification email with a link. The `sendVerificationEmail` takes a data object with the following properties:

- `lead`: The lead object.
- `url`: The URL to send to the user which contains the token.
- `token`: A verification token used to complete the email verification.

and a `request` object as the second parameter.

```ts
// server/auth.ts
import { betterAuth } from 'better-auth';
import { lead } from 'better-auth-lead';
import { sendEmail } from './email'; // your email sending function

export const auth = betterAuth({
  plugins: [
    lead({
      sendVerificationEmail: async ({ lead, url, token }) => {
        const { verificationEmailSentAt } = lead;
        if (
          verificationEmailSentAt &&
          Date.now() - verificationEmailSentAt.getTime() < 60 * 1000 // 1 minute
        ) {
          console.log(
            `Skipping sending verification email to ${lead.email} because a recent email was already sent.`,
          );
          return false;
        }

        void sendEmail({
          to: lead.email,
          subject: 'Newsletter: Verify your email address',
          text: `Click the link to verify your email: ${url}`,
        });

        return true;
      },
      onEmailVerified: async ({ lead }) => {
        // do something when a lead's email is verified
        console.log(`Lead ${lead.email} has been verified!`);
      },
    }),
  ],
});
```

> Avoid awaiting the email sending to prevent timing attacks.

Additionally, you can provide an `onEmailVerified` callback to execute logic after a lead's email is verified.

### Metadata Validation

To validate and parse metadata, you can pass a Standard Schema compatible schema (e.g. Zod, Valibot, ArkType).

```ts
// server/auth.ts
import { betterAuth } from 'better-auth';
import { lead } from 'better-auth-lead';
import * as z from 'zod';

const metadataSchema = z.object({
  preferences: z.enum(['engineering', 'marketing', 'design']),
});

export const auth = betterAuth({
  plugins: [
    lead({
      metadata: {
        validationSchema: metadataSchema,
      },
    }),
  ],
});
```

If the schema validation fails, the API `subscribe` and `update` routes will return a `400 Bad Request` error with `INVALID_METADATA`.

## Schema

### Lead

Table name: `lead`

|  Field         |  Type   |  Key   |  Description                    |
| -------------- | ------- | ------ | ------------------------------- |
| id             | string  | pk     | Unique identifier for each lead |
| email          | string  | unique | Email address of the lead       |
|  emailVerified | boolean |        | Whether the email is verified   |
| metadata       | json    | ?      | Additional data about the lead  |
| createdAt      | date    |        | Timestamp of lead creation      |
| updatedAt      | date    |        | Timestamp of last update        |

#### Prisma

```prisma
model Lead {
  id            String   @id
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  email         String
  emailVerified Boolean  @default(false)
  metadata      String?

  @@unique([email])
  @@map("lead")
}
```

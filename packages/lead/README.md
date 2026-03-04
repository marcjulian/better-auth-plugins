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

```ts
// server/auth.ts
import { betterAuth } from 'better-auth';
import { lead } from 'better-auth-lead';
import { sendEmail } from './email'; // your email sending function

export const auth = betterAuth({
  plugins: [
    lead({
      sendVerificationEmail: async ({ email, url, token }) => {
        void sendEmail({
          to: email,
          subject: 'Newsletter: Verify your email address',
          text: `Click the link to verify your email: ${url}`,
        });
      },
    }),
  ],
});
```

> Avoid awaiting the email sending to prevent timing attacks.

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

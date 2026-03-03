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
npx auth@latest generate
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

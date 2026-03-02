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

## Usage

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

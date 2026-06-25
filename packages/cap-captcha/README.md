# cap-captcha

[Cap](https://trycap.dev/) CAPTCHA plugin for [better-auth](https://better-auth.com).

## Installation

```bash
pnpm add cap-captcha
```

## Usage

```ts
import { betterAuth } from 'better-auth';
import { captcha } from 'cap-captcha';

export const auth = betterAuth({
  plugins: [
    captcha({
      providerUrl: 'https://your-cap-instance/<site-key>',
      secretKey: 'your-secret-key',
    }),
  ],
});
```

## Options

| Option | Type | Description |
| --- | --- | --- |
| `providerUrl` | `string` | URL of your Cap instance, optionally including the site key. |
| `secretKey` | `string` | Secret key from your Cap dashboard. |
| `endpoints` | `string[]` | Auth endpoints to protect. Defaults to sign-up, sign-in (email), and request-password-reset. |

## Development

- Install dependencies: `pnpm install`
- Run tests: `pnpm test`
- Build: `pnpm build`

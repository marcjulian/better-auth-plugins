# better-auth-cap-captcha

[Cap](https://trycap.dev/) CAPTCHA plugin for [better-auth](https://better-auth.com).

## Installation

```bash
pnpm add better-auth-cap-captcha
```

## Usage

```ts
import { betterAuth } from "better-auth";
import { capCaptcha } from "better-auth-cap-captcha";

export const auth = betterAuth({
  plugins: [
    capCaptcha({
      providerUrl: "https://your-cap-instance",
      siteKeys: {
        "site-key-1": "secret-1",
        "site-key-2": "secret-2",
      },
    }),
  ],
});
```

The site key is extracted from the `x-captcha-response` token (format: `siteKey:...:...`), so the frontend widget determines which entry is used. No extra header needed.

```ts
await authClient.signIn.email({
  email: "user@example.com",
  password: "secure-password",
  fetchOptions: {
    headers: {
      "x-captcha-response": capToken,
    },
  },
});
```

Use the the Cap [Widget](https://trycap.dev/guide/widget.html) or [Programmatic mode](https://trycap.dev/guide/programmatic.html) to retrieve a token on the client.

## Options

| Option        | Type                     | Description                                                                                          |
| ------------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `providerUrl` | `string`                 | URL of your Cap instance, e.g. `https://cap.example.com`.                                            |
| `siteKeys`    | `Record<string, string>` | Map of site keys to secret keys. The site key is read from the token.                                |
| `endpoints`   | `string[]`               | Auth endpoints to protect. Defaults to sign-up (email), sign-in (email), and request-password-reset. |

## Protecting other plugin endpoints

Pass `endpoints` to extend protection to routes from other plugins. Note that overriding `endpoints` replaces the defaults, so re-list the auth routes you still want protected:

```ts
import { betterAuth } from "better-auth";
import { capCaptcha } from "better-auth-cap-captcha";
import { lead } from "better-auth-lead";

export const auth = betterAuth({
  plugins: [
    lead(),
    capCaptcha({
      providerUrl: "https://cap.example.com",
      siteKeys: {
        "site-key-1": "secret-1",
      },
      endpoints: [
        "/sign-up/email",
        "/sign-in/email",
        "/request-password-reset",
        "/lead/subscribe",
        "/lead/resend",
      ],
    }),
  ],
});
```

import { Component } from '@angular/core';

import { AuthPanel } from '../ui/auth-panel';
import { CookieBanner } from '../ui/cookie-banner';

@Component({
  selector: 'app-cookie-consent',
  imports: [CookieBanner, AuthPanel],
  template: `
    <div class="px-4 py-16">
      <h1 class="text-4xl font-bold">Cookie Consent Demo</h1>
      <p class="text-muted-foreground mt-2 text-lg">
        Test the cookie consent plugin with sign-in/sign-up to verify auto-merge.
      </p>
    </div>

    <ba-auth-panel />
    <ba-cookie-banner />
  `,
})
export default class CookieConsentPage {}

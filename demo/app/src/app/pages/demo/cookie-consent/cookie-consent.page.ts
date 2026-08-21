import { Component } from '@angular/core';

import { BaseLayout } from '../../../layouts/base.layout';
import { CookieBanner } from './cookie-banner';

@Component({
  selector: 'app-newsletter-page',
  imports: [BaseLayout, CookieBanner],
  template: `
    <app-base-layout mainClass="mx-auto max-w-(--breakpoint-lg) px-4">
      <div>
        <h1 class="text-4xl font-bold">Cookie Consent plugin</h1>
        <p class="text-muted-foreground mt-2 text-lg">GDPR-compliant cookie consent management</p>
      </div>

      <h2 id="examples" class="pt-(--header-height) text-2xl font-semibold">Examples</h2>
      <p class="text-muted-foreground">See the cookie banner at the bottom.</p>

      <app-cookie-banner />
    </app-base-layout>
  `,
})
export class CookieConsentPage {}

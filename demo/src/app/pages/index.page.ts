import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';

import { injectAuthUser } from '../auth/auth-client';
import { BaseLayout } from '../layouts/base.layout';
import { Newsletter } from '../ui/newsletter';
import { NewsletterMetadata } from '../ui/newsletter-metadata';
import { NewsletterUser } from '../ui/newsletter-user';

@Component({
  selector: 'app-home',
  imports: [Newsletter, NewsletterMetadata, HlmButtonImports, BaseLayout, NewsletterUser],
  template: `
    <app-base-layout>
      <div class="px-4 py-16">
        <h1 class="text-4xl font-bold">Better Auth Plugins - Demo</h1>
      </div>

      <ba-newsletter />
      <ba-newsletter-metadata />
      @if (user()) {
        <ba-newsletter-user />
      }
    </app-base-layout>
  `,
})
export default class Home {
  readonly user = injectAuthUser();
}

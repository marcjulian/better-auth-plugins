import { Component } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';

import { Newsletter } from '../ui/newsletter';
import { NewsletterMetadata } from '../ui/newsletter-metadata';

@Component({
  selector: 'app-home',
  imports: [Newsletter, NewsletterMetadata, HlmButtonImports],
  template: `
    <div class="px-4 py-16">
      <h1 class="text-4xl font-bold">Better Auth Plugins - Demo</h1>
    </div>

    <ba-newsletter />
    <ba-newsletter-metadata />
  `,
})
export default class Home {}

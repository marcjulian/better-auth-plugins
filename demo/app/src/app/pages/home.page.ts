import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

import { BaseLayout } from '../layouts/base.layout';

type Plugin = {
  name: string;
  description: string;
  link: string;
};

@Component({
  selector: 'app-home',
  imports: [BaseLayout, HlmCardImports, HlmButton, HlmBadge, RouterLink],
  template: `
    <app-base-layout mainClass="mx-auto max-w-(--breakpoint-lg) px-4">
      <div class="flex flex-col gap-4 py-10">
        <span hlmBadge>Better Auth plugins</span>
        <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          @for (plugin of plugins; track $index) {
            <hlm-card>
              <hlm-card-header>
                <div hlmCardTitle>{{ plugin.name }}</div>
                <div hlmCardDescription>{{ plugin.description }}</div>
                <div hlmCardAction>
                  <a hlmBtn variant="link" [routerLink]="plugin.link">Demo</a>
                </div>
              </hlm-card-header>
            </hlm-card>
          }
        </div>
      </div>
    </app-base-layout>
  `,
})
export class HomePage {
  plugins: Plugin[] = [
    { name: 'Lead', description: 'Use for newsletter or wishlist', link: '/newsletter' },
    {
      name: 'Cookie Consent',
      description: 'GDPR-compliant cookie consent management',
      link: '/cookie-consent',
    },
    // {
    //   name: 'Cap Captcha',
    //   description: 'Add Cap CAPTCHA to your Auth Endpoints',
    //   link: '/cap',
    // },
  ];
}

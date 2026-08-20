import { ChangeDetectionStrategy, Component } from '@angular/core';

import { BaseLayout } from '../../../layouts/base.layout';
import { Newsletter } from './newsletter';

@Component({
  selector: 'app-newsletter-page',
  imports: [BaseLayout, Newsletter],
  template: `
    <app-base-layout mainClass="mx-auto max-w-(--breakpoint-lg) px-4">
      <div>
        <h1 class="text-4xl font-bold">Lead plugin</h1>
        <p class="text-muted-foreground mt-2 text-lg">Use for newsletter or wishlist</p>
      </div>

      <h2 id="examples" class="pt-(--header-height) text-2xl font-semibold">Examples</h2>

      <div class="mt-4 rounded-xl border">
        <app-newsletter />
      </div>
    </app-base-layout>
  `,
})
export class NewsletterPage {}

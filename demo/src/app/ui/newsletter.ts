import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmField, HlmFieldImports } from '@spartan-ng/helm/field';

@Component({
  selector: 'ba-newsletter',
  imports: [HlmButtonImports, HlmInputImports, HlmFieldImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block py-16',
  },
  template: `
    <div
      class="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-12 lg:gap-8 lg:px-8"
    >
      <h2
        class="text-left max-w-xl text-3xl font-semibold tracking-tight text-balance text-gray-900 sm:text-4xl lg:col-span-7"
      >
        Want product news and updates? Sign up for our newsletter.
      </h2>
      <form class="max-w-md lg:col-span-5">
        <hlm-field>
          <hlm-field orientation="horizontal">
            <input hlmInput type="email" placeholder="Enter your email" />
            <button hlmBtn type="submit">Subscribe</button>
          </hlm-field>
          <hlm-field-description class="text-left">
            We care about your data in our privacy policy.
          </hlm-field-description>
        </hlm-field>
      </form>
    </div>
  `,
})
export class Newsletter {}

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { email, form, FormField, required, submit } from '@angular/forms/signals';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

import { injectAuthClient } from '../../../auth/auth-client';

@Component({
  selector: 'app-newsletter',
  imports: [FormField, HlmButtonImports, HlmInputImports, HlmFieldImports, HlmSpinnerImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block py-16',
  },
  template: `
    <div class="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-12 lg:gap-8 lg:px-8">
      <h2
        class="max-w-xl text-left text-3xl font-semibold tracking-tight text-balance text-gray-900 sm:text-4xl lg:col-span-7"
      >
        Want product news and updates? Sign up for our newsletter.
      </h2>
      <form novalidate class="max-w-md lg:col-span-5" (submit)="subscribe($event)">
        <hlm-field>
          <hlm-field orientation="horizontal">
            <input hlmInput type="email" placeholder="Enter your email" [formField]="form.email" />
            <button hlmBtn type="submit" [disabled]="loading()">
              @if (loading()) {
                <hlm-spinner />
              }
              Subscribe
            </button>
          </hlm-field>
          <hlm-field-description class="text-left">
            We care about your data in our privacy policy.
          </hlm-field-description>
          @if (form.email().touched() && form.email().invalid()) {
            @for (error of form.email().errors(); track error) {
              <hlm-field-error>{{ error.message }}</hlm-field-error>
            }
          }
        </hlm-field>
      </form>
    </div>
  `,
})
export class Newsletter {
  private authClient = injectAuthClient();

  model = signal({
    email: '',
  });

  form = form(this.model, (schemaPath) => {
    required(schemaPath.email, { message: 'Email is required' });
    email(schemaPath.email, { message: 'Invalid email address' });
  });

  loading = signal(false);

  async subscribe(event: Event) {
    event.preventDefault();

    submit(this.form, async () => {
      this.loading.set(true);
      const { email } = this.model();

      const { data, error } = await this.authClient.lead.subscribe({
        email,
      });

      this.loading.set(false);

      if (error) {
        toast.error(error?.message || 'Newsletter subscription failed');
      } else if (data) {
        toast.success('Subscribed to newsletter successfully!');
      }
    });
  }
}

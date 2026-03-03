import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import {
  email,
  form,
  FormField,
  required,
  submit,
} from '@angular/forms/signals';
import { authClient } from '../auth-client';
import { toast } from 'ngx-sonner';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';

@Component({
  selector: 'ba-newsletter-metadata',
  imports: [
    FormField,
    HlmButtonImports,
    HlmInputImports,
    HlmFieldImports,
    HlmCheckboxImports,
    HlmRadioGroupImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block py-16',
  },
  template: `
    <div
      class="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-12 lg:gap-8 lg:px-8"
    >
      <h2
        class="max-w-xl text-left text-3xl font-semibold tracking-tight text-balance text-gray-900 sm:text-4xl lg:col-span-7"
      >
        Want product news and updates? Sign up for our newsletter.
      </h2>
      <form class="max-w-md lg:col-span-5" (submit)="subscribe($event)">
        <hlm-field-group>
          <hlm-field>
            <input
              hlmInput
              type="email"
              placeholder="Enter your email"
              [formField]="form.email"
            />

            <hlm-field-description class="text-left">
              We care about your data in our privacy policy.
            </hlm-field-description>
            @if (form.email().touched() && form.email().invalid()) {
              @for (error of form.email().errors(); track error) {
                <hlm-field-error>{{ error.message }}</hlm-field-error>
              }
            }
          </hlm-field>
          <div class="grid grid-cols-2 gap-4">
            <hlm-field-group>
              <fieldset hlmFieldset>
                <legend hlmFieldLegend variant="label">Role</legend>
                <hlm-radio-group [formField]="form.role">
                  @for (role of roles; track role.id) {
                    <hlm-field orientation="horizontal">
                      <hlm-radio [value]="role.id" [id]="'role-' + role.id">
                        <hlm-radio-indicator />
                      </hlm-radio>
                      <label hlmFieldLabel [for]="'role-' + role.id">
                        {{ role.label }}
                      </label>
                    </hlm-field>
                  }
                </hlm-radio-group>
              </fieldset>
            </hlm-field-group>
            <hlm-field-group>
              <fieldset hlmFieldset>
                <legend hlmFieldLegend variant="label">
                  I'm interested in
                </legend>
                <hlm-field-group data-slot="checkbox-group">
                  @for (interest of interests; track interest.id) {
                    <hlm-field orientation="horizontal">
                      <hlm-checkbox
                        [id]="'interest-' + interest.id"
                        [checked]="
                          form.interests().value().includes(interest.id)
                        "
                        (checkedChange)="handleChange($event, interest.id)"
                      />
                      <label
                        hlmFieldLabel
                        class="font-normal"
                        [for]="'interest-' + interest.id"
                      >
                        {{ interest.label }}
                      </label>
                    </hlm-field>
                  }
                </hlm-field-group>
              </fieldset>
            </hlm-field-group>
          </div>
          <hlm-field orientation="horizontal">
            <button hlmBtn type="submit">Subscribe to Newsletter</button>
          </hlm-field>
        </hlm-field-group>
      </form>
    </div>
  `,
})
export class NewsletterMetadata {
  roles = [
    { id: 'ceo', label: 'CEO' },
    { id: 'cto', label: 'CTO' },
    { id: 'dev', label: 'Developer' },
    { id: 'intern', label: 'Intern' },
  ];

  interests = [
    { id: 'pizza', label: 'Pizza' },
    { id: 'burgers', label: 'Burgers' },
    { id: 'sushi', label: 'Sushi' },
    { id: 'tacos', label: 'Tacos' },
  ];

  model = signal<{ email: string; role: string; interests: string[] }>({
    email: '',
    role: '',
    interests: [],
  });

  form = form(this.model, (schemaPath) => {
    required(schemaPath.email, { message: 'Email is required' });
    email(schemaPath.email, { message: 'Invalid email address' });
  });

  handleChange(checked: boolean, id: string) {
    const interests = this.model().interests;

    if (checked) {
      interests.push(id);
    } else {
      const index = interests.findIndex((x) => x === id);
      interests.splice(index, 1);
    }

    this.form.interests().markAsTouched();
  }

  async subscribe(event: Event) {
    event.preventDefault();

    submit(this.form, async () => {
      const { email, role, interests } = this.model();

      const { data, error } = await authClient.lead.subscribe({
        email,
        metadata: {
          role,
          interests,
        },
      });

      if (error) {
        toast.error(error?.message || 'Newsletter subscription failed');
      } else if (data) {
        toast.success('Subscribed to newsletter successfully!');
      }
    });
  }
}

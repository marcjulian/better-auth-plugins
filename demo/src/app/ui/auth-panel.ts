import { ChangeDetectionStrategy, Component, computed, OnDestroy, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { toast } from 'ngx-sonner';

import { authClient } from '../auth-client';

const ANONYMOUS_ID_KEY = 'cookie-consent-anon-id';
const MIN_PASSWORD_LENGTH = 8;

type AuthMode = 'sign-in' | 'sign-up';

@Component({
  selector: 'ba-auth-panel',
  imports: [
    HlmButtonImports,
    HlmInputImports,
    HlmFieldImports,
    HlmSeparatorImports,
    HlmSpinnerImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block py-16',
  },
  template: `
    <div class="mx-auto max-w-md px-6">
      <h2 class="text-3xl font-semibold tracking-tight text-gray-900 mb-6">
        {{ isSignedIn() ? 'Account' : mode() === 'sign-in' ? 'Sign In' : 'Sign Up' }}
      </h2>

      @if (isSignedIn()) {
        <div class="space-y-4">
          <div class="rounded-md border p-4">
            <p class="text-sm text-muted-foreground">Signed in as</p>
            <p class="font-medium">{{ userName() }}</p>
            <p class="text-sm text-muted-foreground">{{ userEmail() }}</p>
          </div>

          <button hlmBtn variant="outline" class="w-full" [disabled]="loading()" (click)="mergeConsent()">
            @if (merging()) {
              <hlm-spinner />
            }
            Merge Cookie Consent
          </button>

          <brn-separator hlmSeparator />

          <button hlmBtn variant="destructive" class="w-full" [disabled]="loading()" (click)="signOut()">
            @if (signingOut()) {
              <hlm-spinner />
            }
            Sign Out
          </button>
        </div>
      } @else {
        <form class="space-y-4" (submit)="onSubmit($event)">
          @if (mode() === 'sign-up') {
            <hlm-field>
              <label hlmFieldLabel for="auth-name">Name</label>
              <input
                hlmInput
                id="auth-name"
                type="text"
                placeholder="Your name"
                class="w-full"
                [value]="name()"
                (input)="name.set($any($event.target).value)"
              />
            </hlm-field>
          }

          <hlm-field>
            <label hlmFieldLabel for="auth-email">Email</label>
            <input
              hlmInput
              id="auth-email"
              type="email"
              placeholder="you&#64;example.com"
              class="w-full"
              [value]="email()"
              (input)="email.set($any($event.target).value)"
            />
          </hlm-field>

          <hlm-field>
            <label hlmFieldLabel for="auth-password">Password</label>
            <input
              hlmInput
              id="auth-password"
              type="password"
              placeholder="••••••••"
              class="w-full"
              [value]="password()"
              (input)="password.set($any($event.target).value)"
            />
          </hlm-field>

          <button hlmBtn type="submit" class="w-full" [disabled]="loading()">
            @if (submitting()) {
              <hlm-spinner />
            }
            {{ mode() === 'sign-in' ? 'Sign In' : 'Sign Up' }}
          </button>

          <brn-separator hlmSeparator />

          <p class="text-center text-sm text-muted-foreground">
            @if (mode() === 'sign-in') {
              Don't have an account?
              <button hlmBtn variant="link" size="sm" type="button" (click)="toggleMode()">Sign Up</button>
            } @else {
              Already have an account?
              <button hlmBtn variant="link" size="sm" type="button" (click)="toggleMode()">Sign In</button>
            }
          </p>
        </form>
      }
    </div>
  `,
})
export class AuthPanel implements OnDestroy {
  readonly mode = signal<AuthMode>('sign-in');
  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly submitting = signal(false);
  readonly signingOut = signal(false);
  readonly merging = signal(false);

  readonly loading = computed(() => this.submitting() || this.signingOut() || this.merging());

  private readonly session = signal<{ user: { name: string; email: string } } | null>(null);
  readonly isSignedIn = computed(() => this.session() !== null);
  readonly userName = computed(() => this.session()?.user?.name ?? '');
  readonly userEmail = computed(() => this.session()?.user?.email ?? '');

  private unsubscribeSession?: () => void;

  constructor() {
    this.loadSession();

    if (typeof window !== 'undefined') {
      this.unsubscribeSession = authClient.useSession.subscribe((val) => {
        if (val.data) {
          this.session.set(val.data as { user: { name: string; email: string } });
        } else {
          this.session.set(null);
        }
      });
    }
  }

  ngOnDestroy() {
    this.unsubscribeSession?.();
  }

  toggleMode() {
    this.mode.update((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
  }

  async onSubmit(event: Event) {
    event.preventDefault();
    if (this.mode() === 'sign-in') {
      await this.signIn();
    } else {
      await this.signUp();
    }
  }

  async signIn() {
    const emailVal = this.email().trim();
    const passwordVal = this.password();

    if (!emailVal || !passwordVal) {
      toast.error('Please fill in all fields');
      return;
    }

    this.submitting.set(true);

    const { data, error } = await authClient.signIn.email({
      email: emailVal,
      password: passwordVal,
    });

    this.submitting.set(false);

    if (error) {
      toast.error(error?.message || 'Sign in failed');
    } else if (data) {
      this.session.set(data as { user: { name: string; email: string } });
      toast.success('Signed in successfully!');
      this.resetForm();
    }
  }

  async signUp() {
    const nameVal = this.name().trim();
    const emailVal = this.email().trim();
    const passwordVal = this.password();

    if (!nameVal || !emailVal || !passwordVal) {
      toast.error('Please fill in all fields');
      return;
    }

    if (passwordVal.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    this.submitting.set(true);

    const { data, error } = await authClient.signUp.email({
      name: nameVal,
      email: emailVal,
      password: passwordVal,
    });

    this.submitting.set(false);

    if (error) {
      toast.error(error?.message || 'Sign up failed');
    } else if (data) {
      this.session.set(data as { user: { name: string; email: string } });
      toast.success('Account created successfully!');
      this.resetForm();
    }
  }

  async signOut() {
    this.signingOut.set(true);

    const { error } = await authClient.signOut();

    this.signingOut.set(false);

    if (error) {
      toast.error('Sign out failed');
    } else {
      this.session.set(null);
      toast.success('Signed out');
    }
  }

  async mergeConsent() {
    const anonymousId = this.getAnonymousId();
    if (!anonymousId) {
      toast.error('No anonymous consent to merge');
      return;
    }

    this.merging.set(true);

    const { data, error } = await authClient.cookieConsent.mergeConsent(anonymousId);

    this.merging.set(false);

    if (error) {
      toast.error(error?.message || 'Failed to merge cookie consent');
    } else if (data?.merged) {
      toast.success('Cookie consent merged to your account');
    } else {
      toast.info('No anonymous consent found to merge');
    }
  }

  private getAnonymousId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ANONYMOUS_ID_KEY);
  }

  private resetForm() {
    this.name.set('');
    this.email.set('');
    this.password.set('');
  }

  private async loadSession() {
    if (typeof window === 'undefined') return;

    try {
      const { data } = await authClient.getSession();
      if (data) {
        this.session.set(data as { user: { name: string; email: string } });
      }
    } catch {
      // Not signed in
    }
  }
}

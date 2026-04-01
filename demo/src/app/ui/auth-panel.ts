import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { email, form, FormField, minLength, required, submit } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { toast } from 'ngx-sonner';

import { authClient } from '../auth-client';

type AuthMode = 'sign-in' | 'sign-up';

@Component({
  selector: 'ba-auth-panel',
  imports: [
    FormField,
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
      <h2 class="mb-6 text-3xl font-semibold tracking-tight text-gray-900">
        {{ isSignedIn() ? 'Account' : mode() === 'sign-in' ? 'Sign In' : 'Sign Up' }}
      </h2>

      @if (isSignedIn()) {
        <div class="space-y-4">
          <div class="rounded-md border p-4">
            <p class="text-muted-foreground text-sm">Signed in as</p>
            <p class="font-medium">{{ userName() }}</p>
            <p class="text-muted-foreground text-sm">{{ userEmail() }}</p>
          </div>

          <brn-separator hlmSeparator />

          <button
            hlmBtn
            variant="destructive"
            class="w-full"
            [disabled]="loading()"
            (click)="signOut()"
          >
            @if (signingOut()) {
              <hlm-spinner />
            }
            Sign Out
          </button>
        </div>
      } @else {
        @if (mode() === 'sign-up') {
          <form class="space-y-4" (submit)="onSignUp($event)">
            <hlm-field>
              <label hlmFieldLabel for="auth-name">Name</label>
              <input
                hlmInput
                id="auth-name"
                type="text"
                placeholder="Your name"
                class="w-full"
                [formField]="signUpForm.name"
              />
              @if (signUpForm.name().touched() && signUpForm.name().invalid()) {
                @for (error of signUpForm.name().errors(); track error) {
                  <hlm-field-error>{{ error.message }}</hlm-field-error>
                }
              }
            </hlm-field>

            <hlm-field>
              <label hlmFieldLabel for="auth-email-up">Email</label>
              <input
                hlmInput
                id="auth-email-up"
                type="email"
                placeholder="you&#64;example.com"
                class="w-full"
                [formField]="signUpForm.email"
              />
              @if (signUpForm.email().touched() && signUpForm.email().invalid()) {
                @for (error of signUpForm.email().errors(); track error) {
                  <hlm-field-error>{{ error.message }}</hlm-field-error>
                }
              }
            </hlm-field>

            <hlm-field>
              <label hlmFieldLabel for="auth-password-up">Password</label>
              <input
                hlmInput
                id="auth-password-up"
                type="password"
                placeholder="••••••••"
                class="w-full"
                [formField]="signUpForm.password"
              />
              @if (signUpForm.password().touched() && signUpForm.password().invalid()) {
                @for (error of signUpForm.password().errors(); track error) {
                  <hlm-field-error>{{ error.message }}</hlm-field-error>
                }
              }
            </hlm-field>

            <button hlmBtn type="submit" class="w-full" [disabled]="loading()">
              @if (submitting()) {
                <hlm-spinner />
              }
              Sign Up
            </button>

            <brn-separator hlmSeparator />

            <p class="text-muted-foreground text-center text-sm">
              Already have an account?
              <button hlmBtn variant="link" size="sm" type="button" (click)="toggleMode()">
                Sign In
              </button>
            </p>
          </form>
        } @else {
          <form class="space-y-4" (submit)="onSignIn($event)">
            <hlm-field>
              <label hlmFieldLabel for="auth-email-in">Email</label>
              <input
                hlmInput
                id="auth-email-in"
                type="email"
                placeholder="you&#64;example.com"
                class="w-full"
                [formField]="signInForm.email"
              />
              @if (signInForm.email().touched() && signInForm.email().invalid()) {
                @for (error of signInForm.email().errors(); track error) {
                  <hlm-field-error>{{ error.message }}</hlm-field-error>
                }
              }
            </hlm-field>

            <hlm-field>
              <label hlmFieldLabel for="auth-password-in">Password</label>
              <input
                hlmInput
                id="auth-password-in"
                type="password"
                placeholder="••••••••"
                class="w-full"
                [formField]="signInForm.password"
              />
              @if (signInForm.password().touched() && signInForm.password().invalid()) {
                @for (error of signInForm.password().errors(); track error) {
                  <hlm-field-error>{{ error.message }}</hlm-field-error>
                }
              }
            </hlm-field>

            <button hlmBtn type="submit" class="w-full" [disabled]="loading()">
              @if (submitting()) {
                <hlm-spinner />
              }
              Sign In
            </button>

            <brn-separator hlmSeparator />

            <p class="text-muted-foreground text-center text-sm">
              Don't have an account?
              <button hlmBtn variant="link" size="sm" type="button" (click)="toggleMode()">
                Sign Up
              </button>
            </p>
          </form>
        }
      }
    </div>
  `,
})
export class AuthPanel implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  readonly mode = signal<AuthMode>('sign-in');
  readonly submitting = signal(false);
  readonly signingOut = signal(false);
  readonly loading = computed(() => this.submitting() || this.signingOut());

  private readonly session = signal<{ user: { name: string; email: string } } | null>(null);
  readonly isSignedIn = computed(() => this.session() !== null);
  readonly userName = computed(() => this.session()?.user?.name ?? '');
  readonly userEmail = computed(() => this.session()?.user?.email ?? '');

  // ─── Sign-in form ───
  signInModel = signal({ email: '', password: '' });
  signInForm = form(this.signInModel, (s) => {
    required(s.email, { message: 'Email is required' });
    email(s.email, { message: 'Invalid email address' });
    required(s.password, { message: 'Password is required' });
  });

  // ─── Sign-up form ───
  signUpModel = signal({ name: '', email: '', password: '' });
  signUpForm = form(this.signUpModel, (s) => {
    required(s.name, { message: 'Name is required' });
    required(s.email, { message: 'Email is required' });
    email(s.email, { message: 'Invalid email address' });
    required(s.password, { message: 'Password is required' });
    minLength(s.password, 8, { message: 'Password must be at least 8 characters' });
  });

  private unsubscribeSession?: () => void;

  constructor() {
    this.loadSession();

    if (isPlatformBrowser(this.platformId)) {
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

  async onSignIn(event: Event) {
    event.preventDefault();
    submit(this.signInForm, async () => {
      this.submitting.set(true);
      const { email, password } = this.signInModel();

      const { data, error } = await authClient.signIn.email({ email, password });

      this.submitting.set(false);

      if (error) {
        toast.error(error?.message || 'Sign in failed');
      } else if (data) {
        this.session.set(data as { user: { name: string; email: string } });
        toast.success('Signed in successfully!');
        this.signInModel.set({ email: '', password: '' });
      }
    });
  }

  async onSignUp(event: Event) {
    event.preventDefault();
    submit(this.signUpForm, async () => {
      this.submitting.set(true);
      const { name, email, password } = this.signUpModel();

      const { data, error } = await authClient.signUp.email({ name, email, password });

      this.submitting.set(false);

      if (error) {
        toast.error(error?.message || 'Sign up failed');
      } else if (data) {
        this.session.set(data as { user: { name: string; email: string } });
        toast.success('Account created successfully!');
        this.signUpModel.set({ name: '', email: '', password: '' });
      }
    });
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

  private async loadSession() {
    if (!isPlatformBrowser(this.platformId)) return;

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

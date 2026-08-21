import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import type { DefaultConsentModel } from 'better-auth-cookie-consent/client';
import { Subscription } from 'rxjs';

import { injectAuthClient } from '../../../auth/auth-client';
import { injectAnonymousId } from './cookie-utils';

const CONSENT_VERSION = 'v1';

type CategoryId = keyof DefaultConsentModel;

const CATEGORIES: { id: CategoryId; label: string; description: string; locked: boolean }[] = [
  {
    id: 'necessary',
    label: 'Necessary',
    description: 'Required for the website to function. Cannot be disabled.',
    locked: true,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Help us understand how visitors interact with our website.',
    locked: false,
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Used to deliver personalized advertisements.',
    locked: false,
  },
  {
    id: 'functional',
    label: 'Functional',
    description: 'Enable enhanced functionality and personalization.',
    locked: false,
  },
];

@Component({
  selector: 'app-cookie-banner',
  imports: [
    HlmButtonImports,
    HlmCheckboxImports,
    HlmFieldImports,
    HlmSeparatorImports,
    HlmSpinnerImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
  template: `
    @if (visible()) {
      <div class="bg-background fixed inset-x-0 bottom-0 z-50 border-t p-6 shadow-lg">
        <div class="mx-auto max-w-4xl">
          <div class="mb-4">
            <h3 class="text-lg font-semibold">🍪 Cookie Preferences</h3>
            <p class="text-muted-foreground mt-1 text-sm">
              We use cookies to improve your experience. Choose which cookies you allow us to use.
            </p>
          </div>

          @if (showDetails()) {
            <div class="mb-4 space-y-3">
              @for (category of categories; track category.id) {
                <div class="flex items-start gap-3">
                  <hlm-checkbox
                    [id]="'consent-' + category.id.toString()"
                    [checked]="consent()[category.id] ?? false"
                    [disabled]="category.locked"
                    (checkedChange)="toggleCategory(category.id, $event)"
                  />
                  <div class="grid gap-0.5">
                    <label
                      hlmFieldLabel
                      class="text-sm font-medium"
                      [for]="'consent-' + category.id.toString()"
                    >
                      {{ category.label }}
                      @if (category.locked) {
                        <span class="text-muted-foreground text-xs">(always on)</span>
                      }
                    </label>
                    <p class="text-muted-foreground text-xs">
                      {{ category.description }}
                    </p>
                  </div>
                </div>
              }
            </div>

            <brn-separator hlmSeparator class="mb-4" />
          }

          <div class="flex flex-wrap items-center gap-3">
            @if (!showDetails()) {
              <button hlmBtn variant="outline" size="sm" (click)="showDetails.set(true)">
                Customize
              </button>
            }

            @if (showDetails()) {
              <button
                hlmBtn
                variant="outline"
                size="sm"
                [disabled]="loading()"
                (click)="savePreferences()"
              >
                @if (loading()) {
                  <hlm-spinner />
                }
                Save Preferences
              </button>
            }

            <button hlmBtn variant="outline" size="sm" [disabled]="loading()" (click)="rejectAll()">
              Reject All
            </button>

            <button hlmBtn size="sm" [disabled]="loading()" (click)="acceptAll()">
              @if (loading()) {
                <hlm-spinner />
              }
              Accept All
            </button>
          </div>
        </div>
      </div>
    } @else if (consentRecorded()) {
      <button
        hlmBtn
        variant="outline"
        size="sm"
        class="fixed bottom-4 left-4 z-50 shadow-md"
        (click)="reopenBanner()"
      >
        🍪 Manage Cookies
      </button>
    }
  `,
})
export class CookieBanner implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly anonymousId = injectAnonymousId();
  private readonly authClient = injectAuthClient();
  private unsubscribeSession?: Subscription;
  private wasLoggedIn = false;

  readonly categories = CATEGORIES;
  readonly visible = signal(false);
  readonly showDetails = signal(false);
  readonly loading = signal(false);
  readonly consentRecorded = signal(false);

  readonly consent = signal<DefaultConsentModel>({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false,
  });

  constructor() {
    this.loadConsent();

    // Watch for session transitions: when the user logs in (null → session),
    // re-fetch consent from the server and update the anonymous ID cookie so
    // that consent survives after logout + page reload.
    if (isPlatformBrowser(this.platformId)) {
      this.unsubscribeSession = this.authClient.useSession().subscribe((val) => {
        const isLoggedIn = !!val.data;
        if (!this.wasLoggedIn && isLoggedIn) {
          this.onSessionAcquired();
        }
        this.wasLoggedIn = isLoggedIn;
      });
    }
  }

  ngOnDestroy() {
    this.unsubscribeSession?.unsubscribe();
  }

  reopenBanner() {
    this.showDetails.set(false);
    this.visible.set(true);
  }

  toggleCategory(id: CategoryId, checked: boolean) {
    this.consent.update((prev) => ({ ...prev, [id]: checked }));
  }

  async acceptAll() {
    this.loading.set(true);
    const anonId = this.anonymousId.getOrCreate();

    const allAccepted: DefaultConsentModel = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
    };
    const { error } = await this.authClient.cookieConsent.setConsent({
      anonymousId: anonId,
      consent: allAccepted,
      consentVersion: CONSENT_VERSION,
    });

    this.loading.set(false);

    if (error) {
      toast.error('Failed to save cookie preferences');
    } else {
      toast.success('All cookies accepted');
      this.consent.set(allAccepted);
      this.visible.set(false);
      this.consentRecorded.set(true);
    }
  }

  async rejectAll() {
    this.loading.set(true);
    const anonId = this.anonymousId.getOrCreate();

    const allRejected: DefaultConsentModel = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
    };
    const { error } = await this.authClient.cookieConsent.setConsent({
      anonymousId: anonId,
      consent: allRejected,
      consentVersion: CONSENT_VERSION,
    });

    this.loading.set(false);

    if (error) {
      toast.error('Failed to save cookie preferences');
    } else {
      toast.success('Non-essential cookies rejected');
      this.consent.set(allRejected);
      this.visible.set(false);
      this.consentRecorded.set(true);
    }
  }

  async savePreferences() {
    this.loading.set(true);
    const anonId = this.anonymousId.getOrCreate();

    const consentValue = { ...this.consent(), necessary: true };
    const { error } = await this.authClient.cookieConsent.setConsent({
      anonymousId: anonId,
      consent: consentValue,
      consentVersion: CONSENT_VERSION,
    });

    this.loading.set(false);

    if (error) {
      toast.error('Failed to save cookie preferences');
    } else {
      toast.success('Cookie preferences saved');
      this.visible.set(false);
      this.consentRecorded.set(true);
    }
  }

  /**
   * Called on initial page load. Only queries the server when there is an
   * anonymous ID cookie or an active session — otherwise we can show the
   * banner right away without a network round-trip.
   */
  private async loadConsent() {
    const anonId = this.anonymousId.get();

    if (!anonId) {
      // No anonymous cookie — check if the user has an active session
      if (!isPlatformBrowser(this.platformId)) {
        this.visible.set(true);
        return;
      }

      try {
        const { data: session } = await this.authClient.useSession()();
        if (!session) {
          // Not logged in, no anonId → show banner immediately
          this.visible.set(true);
          return;
        }
      } catch {
        this.visible.set(true);
        return;
      }
    }

    // Either anonId exists or user has an active session — ask server
    await this.fetchAndApplyConsent(anonId ?? undefined);
  }

  /**
   * Called when the user session transitions from null → logged-in.
   * Re-fetches consent from the server and stores the anonymous ID cookie
   * so that after the user logs out the consent can still be resolved.
   */
  private async onSessionAcquired() {
    await this.fetchAndApplyConsent(this.anonymousId.get() ?? undefined);
  }

  /**
   * Fetch consent from server and apply it to the banner state.
   * Also persists the anonymous ID cookie so consent survives after logout.
   */
  private async fetchAndApplyConsent(anonymousId?: string) {
    const { data, error } = await this.authClient.cookieConsent.getConsent(anonymousId);

    if (!error && data?.consent && data.versionMatch) {
      this.consent.set(data.consent.consent);
      this.visible.set(false);
      this.consentRecorded.set(true);
      // Ensure the anonymous ID cookie is set so consent persists after logout
      if (data.consent.anonymousId) {
        this.anonymousId.set(data.consent.anonymousId);
      }
    } else {
      this.visible.set(true);
    }
  }
}

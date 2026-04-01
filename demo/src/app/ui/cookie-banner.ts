import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { toast } from 'ngx-sonner';

import { authClient } from '../auth-client';
import { injectAnonymousId } from './cookie-utils';

const CONSENT_VERSION = 'v1';

const CATEGORIES = [
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
  selector: 'ba-cookie-banner',
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
      <div
        class="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-6 shadow-lg"
      >
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
                    [id]="'consent-' + category.id"
                    [checked]="consent()[category.id] ?? false"
                    [disabled]="category.locked"
                    (checkedChange)="toggleCategory(category.id, $event)"
                  />
                  <div class="grid gap-0.5">
                    <label
                      hlmFieldLabel
                      class="text-sm font-medium"
                      [for]="'consent-' + category.id"
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
              <button
                hlmBtn
                variant="outline"
                size="sm"
                (click)="showDetails.set(true)"
              >
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

            <button
              hlmBtn
              variant="outline"
              size="sm"
              [disabled]="loading()"
              (click)="rejectAll()"
            >
              Reject All
            </button>

            <button
              hlmBtn
              size="sm"
              [disabled]="loading()"
              (click)="acceptAll()"
            >
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
  private unsubscribeSession?: () => void;
  private wasLoggedIn = false;

  readonly categories = CATEGORIES;
  readonly visible = signal(false);
  readonly showDetails = signal(false);
  readonly loading = signal(false);
  readonly consentRecorded = signal(false);

  readonly consent = signal<Record<string, boolean>>({
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
      this.unsubscribeSession = authClient.useSession.subscribe((val) => {
        const isLoggedIn = !!val.data;
        if (!this.wasLoggedIn && isLoggedIn) {
          this.onSessionAcquired();
        }
        this.wasLoggedIn = isLoggedIn;
      });
    }
  }

  ngOnDestroy() {
    this.unsubscribeSession?.();
  }

  reopenBanner() {
    this.showDetails.set(false);
    this.visible.set(true);
  }

  toggleCategory(id: string, checked: boolean) {
    this.consent.update((prev) => ({ ...prev, [id]: checked }));
  }

  async acceptAll() {
    this.loading.set(true);
    const anonId = this.anonymousId.getOrCreate();

    const { error } = await authClient.cookieConsent.acceptAll({
      anonymousId: anonId,
      consentVersion: CONSENT_VERSION,
    });

    this.loading.set(false);

    if (error) {
      toast.error('Failed to save cookie preferences');
    } else {
      toast.success('All cookies accepted');
      this.visible.set(false);
      this.consentRecorded.set(true);
      // Sync local state from server so reopening the banner shows correct values
      await this.fetchAndApplyConsent(anonId);
    }
  }

  async rejectAll() {
    this.loading.set(true);
    const anonId = this.anonymousId.getOrCreate();

    const { error } = await authClient.cookieConsent.rejectAll({
      anonymousId: anonId,
      consentVersion: CONSENT_VERSION,
    });

    this.loading.set(false);

    if (error) {
      toast.error('Failed to save cookie preferences');
    } else {
      toast.success('Non-essential cookies rejected');
      this.visible.set(false);
      this.consentRecorded.set(true);
      // Sync local state from server so reopening the banner shows correct values
      await this.fetchAndApplyConsent(anonId);
    }
  }

  async savePreferences() {
    this.loading.set(true);
    const anonId = this.anonymousId.getOrCreate();

    const { error } = await authClient.cookieConsent.updatePreferences({
      anonymousId: anonId,
      consent: { ...this.consent(), necessary: true },
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
        const { data: session } = await authClient.getSession();
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
    const { data, error } = await authClient.cookieConsent.getConsent(anonymousId);

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

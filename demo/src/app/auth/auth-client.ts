import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { cookieConsentClient, type DefaultConsentModel } from 'better-auth-cookie-consent/client';
import { leadClient } from 'better-auth-lead/client';

import type { LeadMetadata } from '../../shared/lead-metadata-schema';
import { createAuthClient } from './better-auth-adapter';

export const injectAuthClient = createAuthClient({
  plugins: [leadClient<LeadMetadata>(), cookieConsentClient<DefaultConsentModel>()],
});

export const injectAuthSession = () => {
  const auth = injectAuthClient();
  return auth.useSession();
};

export const injectAuthUser = () => {
  const session = injectAuthSession();
  return computed(() => session().data?.user || null);
};

export const injectLogout = () => {
  const auth = injectAuthClient();
  const router = inject(Router);

  return async () => {
    await auth.signOut({
      fetchOptions: {
        onSuccess: async () => {
          await auth.useSession()().refetch();
          await router.navigateByUrl('/login', { replaceUrl: true });
        },
      },
    });
  };
};

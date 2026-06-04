import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { leadClient } from 'better-auth-lead/client';
import z from 'zod';

import type { LeadMetadata } from '../../shared/lead-metadata-schema';
import { createAuthClient } from './better-auth-adapter';
export type ConsentModel = z.infer<typeof defaultConsentSchema>;
import { defaultConsentSchema } from 'better-auth-cookie-consent';
import { cookieConsentClient } from 'better-auth-cookie-consent/client';

export const injectAuthClient = createAuthClient({
  plugins: [leadClient<LeadMetadata>(), cookieConsentClient<ConsentModel>()],
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

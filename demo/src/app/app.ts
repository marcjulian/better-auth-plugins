import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToaster } from '@spartan-ng/helm/sonner';

import { CookieBanner } from './ui/cookie-banner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HlmToaster, CookieBanner],
  template: `
    <router-outlet />

    @defer {
      <hlm-toaster />
    }

    @defer {
      <ba-cookie-banner />
    }
  `,
})
export class App {}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePuzzle } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';

import { injectAuthUser, injectLogout } from '../auth/auth-client';

@Component({
  selector: 'app-header',
  imports: [RouterLink, HlmButtonImports, NgIcon],
  providers: [provideIcons({ lucidePuzzle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="bg-background/40 sticky top-0 z-10 flex h-(--header-height) items-center gap-2 px-4 backdrop-blur-lg"
    >
      <a routerLink="/" hlmBtn variant="ghost" size="sm">
        <ng-icon name="lucidePuzzle" />
        ba-plugins
      </a>

      <div class="ml-auto flex gap-1">
        @if (user()) {
          <button hlmBtn variant="outline" size="sm" (click)="logout()">Logout</button>
        } @else {
          <a hlmBtn variant="outline" size="sm" routerLink="/login">Login</a>
          <a hlmBtn size="sm" routerLink="/register">Register</a>
        }
      </div>
    </header>
  `,
})
export class Header {
  readonly user = injectAuthUser();
  readonly logout = injectLogout();
}

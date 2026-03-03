import { Component } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';

import { Newsletter } from '../ui/newsletter';

@Component({
  selector: 'app-home',
  imports: [Newsletter, HlmButtonImports],
  template: `
    <div>
      <h1>Welcome to the Better Auth Plugins Demo!</h1>
      <button hlmBtn>Click me</button>
    </div>

    <ba-newsletter />
  `,
})
export default class Home {}

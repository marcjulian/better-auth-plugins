import { Component } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-home',
  imports: [HlmButtonImports],
  template: `
    <h1>Welcome to the Better Auth Plugins Demo!</h1>

    <button hlmBtn>Click me</button>
  `,
})
export default class Home {}

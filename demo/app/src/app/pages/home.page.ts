import { Component } from '@angular/core';

import { BaseLayout } from '../layouts/base.layout';

@Component({
  selector: 'app-home',
  imports: [BaseLayout],
  template: ` <app-base-layout></app-base-layout> `,
})
export class HomePage {}

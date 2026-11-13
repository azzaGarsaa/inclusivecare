import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The page's <h1>. After each navigation the shell moves focus here, so
 * keyboard and screen reader users start at the top of the new page.
 */
@Component({
  selector: 'app-page-heading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1 id="page-title" tabindex="-1"><ng-content /></h1>`,
})
export class PageHeading {}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { PageHeading } from '../../shared/ui/page-heading';

@Component({
  selector: 'app-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective, MatButtonModule, PageHeading],
  template: `
    <section class="narrow stack" *transloco="let t">
      <app-page-heading>{{ t('notFound.title') }}</app-page-heading>
      <p>{{ t('notFound.text') }}</p>
      <a matButton="filled" routerLink="/">{{ t('notFound.backHome') }}</a>
    </section>
  `,
})
export class NotFoundPage {}

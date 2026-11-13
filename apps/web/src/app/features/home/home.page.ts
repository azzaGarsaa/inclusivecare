import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthService } from '../../core/auth/auth.service';
import { PageHeading } from '../../shared/ui/page-heading';

@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective, MatButtonModule, PageHeading],
  template: `
    <ng-container *transloco="let t">
      <section class="hero">
        <app-page-heading>{{ t('home.title') }}</app-page-heading>
        <p class="lead">{{ t('home.lead') }}</p>
        <div class="cluster">
          @if (auth.isSignedIn()) {
            <a matButton="filled" routerLink="/dashboard">{{ t('home.goToDashboard') }}</a>
          } @else {
            <a matButton="filled" routerLink="/auth/register">{{ t('nav.register') }}</a>
            <a matButton="outlined" routerLink="/auth/login">{{ t('nav.signIn') }}</a>
          }
        </div>
      </section>

      <section aria-labelledby="promises-title" class="promises">
        <h2 id="promises-title">{{ t('home.promisesTitle') }}</h2>
        <ul class="promise-list">
          @for (item of promises; track item) {
            <li class="card">
              <h3>{{ t('home.promises.' + item + '.title') }}</h3>
              <p>{{ t('home.promises.' + item + '.text') }}</p>
            </li>
          }
        </ul>
      </section>
    </ng-container>
  `,
  styles: `
    .hero {
      padding-block: 1.5rem 2.5rem;
    }
    .lead {
      font-size: 1.2rem;
      max-width: 60ch;
    }
    .promise-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
      gap: 1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .promise-list p {
      margin: 0;
    }
  `,
})
export class HomePage {
  protected readonly auth = inject(AuthService);
  protected readonly promises = ['accessible', 'private', 'multilingual'] as const;
}

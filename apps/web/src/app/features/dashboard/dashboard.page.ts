import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthService } from '../../core/auth/auth.service';
import { PageHeading } from '../../shared/ui/page-heading';

/**
 * Starting point after sign-in. For now it links to what exists; orders,
 * rentals, appointments and reminders join it as their modules are built.
 */
@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective, PageHeading],
  template: `
    <ng-container *transloco="let t">
      @if (auth.user(); as user) {
        <app-page-heading>{{ t('dashboard.welcome', { name: user.firstName }) }}</app-page-heading>
        <p>{{ t('dashboard.intro') }}</p>

        <ul class="tiles">
          <li class="card">
            <h2>
              <a routerLink="/account">{{ t('dashboard.account.title') }}</a>
            </h2>
            <p>{{ t('dashboard.account.text') }}</p>
          </li>
          <li class="card">
            <h2>
              <a routerLink="/accessibility">{{ t('dashboard.accessibility.title') }}</a>
            </h2>
            <p>{{ t('dashboard.accessibility.text') }}</p>
          </li>
          @if (auth.isAdmin()) {
            <li class="card">
              <h2>
                <a routerLink="/admin/users">{{ t('dashboard.adminUsers.title') }}</a>
              </h2>
              <p>{{ t('dashboard.adminUsers.text') }}</p>
            </li>
          }
        </ul>
      }
    </ng-container>
  `,
  styles: `
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
      gap: 1rem;
      margin: 1.5rem 0 0;
      padding: 0;
      list-style: none;
    }
    .tiles h2 {
      font-size: 1.2rem;
    }
    .tiles p {
      margin: 0;
    }
  `,
})
export class DashboardPage {
  protected readonly auth = inject(AuthService);
}

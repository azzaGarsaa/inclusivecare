import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Alert } from '../../shared/ui/alert';
import { PageHeading } from '../../shared/ui/page-heading';
import { AuthApiService } from './auth-api.service';

/** Landing page for the confirmation link sent by email. */
@Component({
  selector: 'app-verify-email-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective, MatButtonModule, PageHeading, Alert],
  template: `
    <section class="narrow stack" *transloco="let t">
      <app-page-heading>{{ t('verifyEmail.title') }}</app-page-heading>

      @switch (state()) {
        @case ('verifying') {
          <p role="status">{{ t('verifyEmail.verifying') }}</p>
        }
        @case ('verified') {
          <app-alert kind="success">{{ t('verifyEmail.success') }}</app-alert>
          <a matButton="filled" routerLink="/auth/login">{{ t('nav.signIn') }}</a>
        }
        @case ('failed') {
          <app-alert kind="error">{{ t('verifyEmail.failed') }}</app-alert>
          <p>{{ t('verifyEmail.failedHelp') }}</p>
          <a matButton="outlined" routerLink="/auth/login">{{ t('nav.signIn') }}</a>
        }
      }
    </section>
  `,
})
export class VerifyEmailPage implements OnInit {
  private readonly authApi = inject(AuthApiService);

  /** `?token=` from the emailed link, bound by the router. */
  readonly token = input<string>();
  protected readonly state = signal<'verifying' | 'verified' | 'failed'>('verifying');

  async ngOnInit(): Promise<void> {
    const token = this.token();
    if (!token) {
      this.state.set('failed');
      return;
    }
    try {
      await this.authApi.verifyEmail(token);
      this.state.set('verified');
    } catch {
      this.state.set('failed');
    }
  }
}

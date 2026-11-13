import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { errorCode } from '../../core/api/api-error';
import { newPasswordValidators, readyToSubmit } from '../../shared/forms/form-utils';
import { PasswordField } from '../../shared/forms/password-field';
import { Alert } from '../../shared/ui/alert';
import { PageHeading } from '../../shared/ui/page-heading';
import { AuthApiService } from './auth-api.service';

/** Landing page for the password reset link sent by email. */
@Component({
  selector: 'app-reset-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoDirective,
    MatButtonModule,
    PageHeading,
    Alert,
    PasswordField,
  ],
  template: `
    <section class="narrow stack" *transloco="let t">
      <app-page-heading>{{ t('resetPassword.title') }}</app-page-heading>

      @if (done()) {
        <app-alert kind="success">{{ t('resetPassword.success') }}</app-alert>
        <a matButton="filled" routerLink="/auth/login">{{ t('nav.signIn') }}</a>
      } @else if (!token()) {
        <app-alert kind="error">{{ t('errors.TOKEN_INVALID') }}</app-alert>
        <a matButton="outlined" routerLink="/auth/forgot-password">{{
          t('resetPassword.requestNew')
        }}</a>
      } @else {
        @if (error(); as code) {
          <app-alert kind="error">
            {{ t('errors.' + code) }}
            @if (code === 'TOKEN_INVALID') {
              <a routerLink="/auth/forgot-password">{{ t('resetPassword.requestNew') }}</a>
            }
          </app-alert>
        }

        <form
          class="form"
          [formGroup]="form"
          #formElement
          (ngSubmit)="submit(formElement)"
          novalidate
        >
          <app-password-field
            [control]="form.controls.password"
            [label]="t('fields.newPassword')"
            [hint]="t('fields.passwordHint')"
            autocomplete="new-password"
          />
          <div class="form-actions">
            <button matButton="filled" type="submit" [attr.aria-busy]="busy()">
              {{ busy() ? t('common.pleaseWait') : t('resetPassword.submit') }}
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class ResetPasswordPage {
  private readonly authApi = inject(AuthApiService);

  /** `?token=` from the emailed link, bound by the router. */
  readonly token = input<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    password: ['', newPasswordValidators],
  });
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async submit(formElement: HTMLFormElement): Promise<void> {
    const token = this.token();
    if (!token || this.busy() || !readyToSubmit(this.form, formElement)) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      await this.authApi.resetPassword(token, this.form.controls.password.value);
      this.done.set(true);
    } catch (error) {
      this.error.set(errorCode(error));
    } finally {
      this.busy.set(false);
    }
  }
}

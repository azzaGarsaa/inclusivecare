import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { errorCode } from '../../core/api/api-error';
import { safeReturnUrl } from '../../core/auth/auth.guards';
import { AuthService } from '../../core/auth/auth.service';
import { FieldErrorPipe } from '../../shared/forms/field-error.pipe';
import {
  currentPasswordValidators,
  emailValidators,
  readyToSubmit,
} from '../../shared/forms/form-utils';
import { PasswordField } from '../../shared/forms/password-field';
import { Alert } from '../../shared/ui/alert';
import { PageHeading } from '../../shared/ui/page-heading';
import { AuthApiService } from './auth-api.service';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoDirective,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    PageHeading,
    Alert,
    PasswordField,
    FieldErrorPipe,
  ],
  template: `
    <section class="narrow stack" *transloco="let t">
      <app-page-heading>{{ t('login.title') }}</app-page-heading>

      @if (expired() && !error()) {
        <app-alert kind="info">{{ t('login.sessionExpired') }}</app-alert>
      }

      @if (error(); as code) {
        <app-alert kind="error">
          {{ t('errors.' + code) }}
          @if (code === 'EMAIL_NOT_VERIFIED') {
            <button matButton type="button" (click)="resendVerification()">
              {{ t('login.resendVerification') }}
            </button>
          }
        </app-alert>
      }
      @if (verificationResent()) {
        <app-alert kind="success">{{ t('checkEmail.resent') }}</app-alert>
      }

      <form
        class="form"
        [formGroup]="form"
        #formElement
        (ngSubmit)="submit(formElement)"
        novalidate
      >
        <mat-form-field appearance="outline">
          <mat-label>{{ t('fields.email') }}</mat-label>
          <input
            matInput
            type="email"
            formControlName="email"
            autocomplete="email"
            inputmode="email"
            required
          />
          <mat-error>{{ form.controls.email.errors | fieldError }}</mat-error>
        </mat-form-field>

        <app-password-field [control]="form.controls.password" [label]="t('fields.password')" />

        <div class="form-actions">
          <button matButton="filled" type="submit" [attr.aria-busy]="busy()">
            {{ busy() ? t('common.pleaseWait') : t('login.submit') }}
          </button>
        </div>
      </form>

      <p>
        <a routerLink="/auth/forgot-password">{{ t('login.forgotPassword') }}</a>
      </p>
      <p>
        {{ t('login.noAccount') }} <a routerLink="/auth/register">{{ t('login.createAccount') }}</a>
      </p>
    </section>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  /** Query parameters, bound by the router. */
  readonly returnUrl = input<string>();
  readonly expired = input<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', emailValidators],
    password: ['', currentPasswordValidators],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly verificationResent = signal(false);

  protected async submit(formElement: HTMLFormElement): Promise<void> {
    if (this.busy() || !readyToSubmit(this.form, formElement)) return;

    this.busy.set(true);
    this.error.set(null);
    this.verificationResent.set(false);
    try {
      await this.auth.login(this.form.getRawValue());
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (error) {
      this.error.set(errorCode(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async resendVerification(): Promise<void> {
    await this.authApi.resendVerification(this.form.controls.email.value);
    this.error.set(null);
    this.verificationResent.set(true);
  }
}

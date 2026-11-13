import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { errorCode } from '../../core/api/api-error';
import { FieldErrorPipe } from '../../shared/forms/field-error.pipe';
import { emailValidators, readyToSubmit } from '../../shared/forms/form-utils';
import { Alert } from '../../shared/ui/alert';
import { PageHeading } from '../../shared/ui/page-heading';
import { AuthApiService } from './auth-api.service';

@Component({
  selector: 'app-forgot-password-page',
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
    FieldErrorPipe,
  ],
  template: `
    <section class="narrow stack" *transloco="let t">
      <app-page-heading>{{ t('forgotPassword.title') }}</app-page-heading>

      @if (sent()) {
        <!-- Deliberately the same message whether or not the address has an account. -->
        <app-alert kind="success">{{ t('forgotPassword.sent') }}</app-alert>
        <a matButton="outlined" routerLink="/auth/login">{{ t('forgotPassword.backToLogin') }}</a>
      } @else {
        <p>{{ t('forgotPassword.intro') }}</p>

        @if (error(); as code) {
          <app-alert kind="error">{{ t('errors.' + code) }}</app-alert>
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

          <div class="form-actions">
            <button matButton="filled" type="submit" [attr.aria-busy]="busy()">
              {{ busy() ? t('common.pleaseWait') : t('forgotPassword.submit') }}
            </button>
            <a matButton routerLink="/auth/login">{{ t('forgotPassword.backToLogin') }}</a>
          </div>
        </form>
      }
    </section>
  `,
})
export class ForgotPasswordPage {
  private readonly authApi = inject(AuthApiService);

  protected readonly form = inject(NonNullableFormBuilder).group({ email: ['', emailValidators] });
  protected readonly busy = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async submit(formElement: HTMLFormElement): Promise<void> {
    if (this.busy() || !readyToSubmit(this.form, formElement)) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      await this.authApi.forgotPassword(this.form.controls.email.value);
      this.sent.set(true);
    } catch (error) {
      this.error.set(errorCode(error));
    } finally {
      this.busy.set(false);
    }
  }
}

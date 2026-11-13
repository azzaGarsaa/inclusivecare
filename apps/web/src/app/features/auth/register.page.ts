import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { errorCode } from '../../core/api/api-error';
import { LanguageService } from '../../core/i18n/language.service';
import { FieldErrorPipe } from '../../shared/forms/field-error.pipe';
import {
  emailValidators,
  nameValidators,
  newPasswordValidators,
  readyToSubmit,
} from '../../shared/forms/form-utils';
import { PasswordField } from '../../shared/forms/password-field';
import { Alert } from '../../shared/ui/alert';
import { PageHeading } from '../../shared/ui/page-heading';
import { AuthApiService } from './auth-api.service';

@Component({
  selector: 'app-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoDirective,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    PageHeading,
    Alert,
    PasswordField,
    FieldErrorPipe,
  ],
  template: `
    <section class="narrow stack" *transloco="let t">
      @if (sentTo(); as email) {
        <app-page-heading>{{ t('checkEmail.title') }}</app-page-heading>
        <app-alert kind="success">{{ t('checkEmail.sent', { email }) }}</app-alert>
        <p>{{ t('checkEmail.instructions') }}</p>
        @if (resent()) {
          <app-alert kind="success">{{ t('checkEmail.resent') }}</app-alert>
        }
        <div class="form-actions">
          <button matButton="outlined" type="button" (click)="resend(email)">
            {{ t('checkEmail.resend') }}
          </button>
          <a matButton routerLink="/auth/login">{{ t('nav.signIn') }}</a>
        </div>
      } @else {
        <app-page-heading>{{ t('register.title') }}</app-page-heading>
        <p>{{ t('register.intro') }}</p>

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
            <mat-label>{{ t('fields.firstName') }}</mat-label>
            <input matInput formControlName="firstName" autocomplete="given-name" required />
            <mat-error>{{ form.controls.firstName.errors | fieldError }}</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ t('fields.lastName') }}</mat-label>
            <input matInput formControlName="lastName" autocomplete="family-name" required />
            <mat-error>{{ form.controls.lastName.errors | fieldError }}</mat-error>
          </mat-form-field>

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

          <app-password-field
            [control]="form.controls.password"
            [label]="t('fields.password')"
            [hint]="t('fields.passwordHint')"
            autocomplete="new-password"
          />

          <div class="terms">
            <mat-checkbox
              formControlName="acceptTerms"
              [aria-describedby]="termsInvalid() ? 'terms-error' : ''"
              required
            >
              {{ t('register.acceptTerms') }}
            </mat-checkbox>
            @if (termsInvalid()) {
              <p id="terms-error" class="field-error">{{ t('register.termsRequired') }}</p>
            }
          </div>

          <div class="form-actions">
            <button matButton="filled" type="submit" [attr.aria-busy]="busy()">
              {{ busy() ? t('common.pleaseWait') : t('register.submit') }}
            </button>
          </div>
        </form>

        <p>
          {{ t('register.haveAccount') }} <a routerLink="/auth/login">{{ t('nav.signIn') }}</a>
        </p>
      }
    </section>
  `,
  styles: `
    .terms {
      margin-block-start: 0.5rem;
    }
    .field-error {
      margin: 0;
      padding-inline-start: 0.75rem;
      color: var(--ic-error-text);
      font-size: 0.875rem;
    }
  `,
})
export class RegisterPage {
  private readonly authApi = inject(AuthApiService);
  private readonly language = inject(LanguageService);

  protected readonly form = inject(NonNullableFormBuilder).group({
    firstName: ['', nameValidators],
    lastName: ['', nameValidators],
    email: ['', emailValidators],
    password: ['', newPasswordValidators],
    acceptTerms: [false, Validators.requiredTrue],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sentTo = signal<string | null>(null);
  protected readonly resent = signal(false);
  private readonly submitted = signal(false);

  protected termsInvalid(): boolean {
    return this.submitted() && this.form.controls.acceptTerms.invalid;
  }

  protected async submit(formElement: HTMLFormElement): Promise<void> {
    this.submitted.set(true);
    if (this.busy() || !readyToSubmit(this.form, formElement)) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      const value = this.form.getRawValue();
      await this.authApi.register({ ...value, locale: this.language.lang() });
      this.sentTo.set(value.email.trim());
    } catch (error) {
      this.error.set(errorCode(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async resend(email: string): Promise<void> {
    await this.authApi.resendVerification(email);
    this.resent.set(true);
  }
}

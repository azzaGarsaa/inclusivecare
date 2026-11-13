import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormGroupDirective, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { errorCode } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { FieldErrorPipe } from '../../shared/forms/field-error.pipe';
import {
  currentPasswordValidators,
  nameValidators,
  newPasswordValidators,
  readyToSubmit,
} from '../../shared/forms/form-utils';
import { PasswordField } from '../../shared/forms/password-field';
import { Alert } from '../../shared/ui/alert';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/ui/confirm-dialog';
import { PageHeading } from '../../shared/ui/page-heading';
import { AccountApiService } from './account-api.service';

type Outcome = { kind: 'success' } | { kind: 'error'; code: string } | null;

@Component({
  selector: 'app-account-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
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
    <div class="narrow" *transloco="let t">
      <app-page-heading>{{ t('account.title') }}</app-page-heading>

      <section class="stack" aria-labelledby="profile-title">
        <h2 id="profile-title">{{ t('account.profile.title') }}</h2>
        <p class="muted">{{ t('account.profile.email', { email: auth.user()?.email }) }}</p>

        @if (profileOutcome(); as outcome) {
          @if (outcome.kind === 'success') {
            <app-alert kind="success">{{ t('account.profile.saved') }}</app-alert>
          } @else {
            <app-alert kind="error">{{ t('errors.' + outcome.code) }}</app-alert>
          }
        }

        <form
          class="form"
          [formGroup]="profileForm"
          #profileElement
          (ngSubmit)="saveProfile(profileElement)"
          novalidate
        >
          <mat-form-field appearance="outline">
            <mat-label>{{ t('fields.firstName') }}</mat-label>
            <input matInput formControlName="firstName" autocomplete="given-name" required />
            <mat-error>{{ profileForm.controls.firstName.errors | fieldError }}</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ t('fields.lastName') }}</mat-label>
            <input matInput formControlName="lastName" autocomplete="family-name" required />
            <mat-error>{{ profileForm.controls.lastName.errors | fieldError }}</mat-error>
          </mat-form-field>
          <div class="form-actions">
            <button matButton="filled" type="submit">{{ t('common.save') }}</button>
          </div>
        </form>
      </section>

      <section class="stack" aria-labelledby="password-title">
        <h2 id="password-title">{{ t('account.password.title') }}</h2>
        <p>{{ t('account.password.intro') }}</p>

        @if (passwordOutcome(); as outcome) {
          @if (outcome.kind === 'success') {
            <app-alert kind="success">{{ t('account.password.saved') }}</app-alert>
          } @else {
            <app-alert kind="error">{{ t('errors.' + outcome.code) }}</app-alert>
          }
        }

        <form
          class="form"
          [formGroup]="passwordForm"
          #passwordElement
          #passwordDirective="ngForm"
          (ngSubmit)="changePassword(passwordElement, passwordDirective)"
          novalidate
        >
          <app-password-field
            [control]="passwordForm.controls.currentPassword"
            [label]="t('fields.currentPassword')"
          />
          <app-password-field
            [control]="passwordForm.controls.newPassword"
            [label]="t('fields.newPassword')"
            [hint]="t('fields.passwordHint')"
            autocomplete="new-password"
          />
          <div class="form-actions">
            <button matButton="filled" type="submit">{{ t('account.password.submit') }}</button>
          </div>
        </form>
      </section>

      <section class="stack danger" aria-labelledby="delete-title">
        <h2 id="delete-title">{{ t('account.delete.title') }}</h2>
        <p>{{ t('account.delete.intro') }}</p>

        @if (deleteError(); as code) {
          <app-alert kind="error">{{ t('errors.' + code) }}</app-alert>
        }

        <form
          class="form"
          [formGroup]="deleteForm"
          #deleteElement
          (ngSubmit)="deleteAccount(deleteElement)"
          novalidate
        >
          <app-password-field
            [control]="deleteForm.controls.password"
            [label]="t('fields.currentPassword')"
          />
          <div class="form-actions">
            <button matButton="outlined" type="submit" class="danger-button">
              {{ t('account.delete.submit') }}
            </button>
          </div>
        </form>
      </section>
    </div>
  `,
  styles: `
    section {
      margin-block-start: 2.5rem;
      padding-block-start: 1.5rem;
      border-block-start: 1px solid var(--ic-border);
    }
    .danger-button {
      --mat-button-outlined-label-text-color: var(--ic-error-text);
      --mat-button-outlined-outline-color: var(--ic-error-text);
    }
  `,
})
export class AccountPage {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(AccountApiService);
  private readonly dialog = inject(MatDialog);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly profileForm = this.fb.group({
    firstName: [this.auth.user()?.firstName ?? '', nameValidators],
    lastName: [this.auth.user()?.lastName ?? '', nameValidators],
  });
  protected readonly passwordForm = this.fb.group({
    currentPassword: ['', currentPasswordValidators],
    newPassword: ['', newPasswordValidators],
  });
  protected readonly deleteForm = this.fb.group({ password: ['', currentPasswordValidators] });

  protected readonly profileOutcome = signal<Outcome>(null);
  protected readonly passwordOutcome = signal<Outcome>(null);
  protected readonly deleteError = signal<string | null>(null);

  protected async saveProfile(formElement: HTMLFormElement): Promise<void> {
    this.profileOutcome.set(null);
    if (!readyToSubmit(this.profileForm, formElement)) return;
    try {
      this.auth.setUser(await this.api.updateProfile(this.profileForm.getRawValue()));
      this.profileOutcome.set({ kind: 'success' });
    } catch (error) {
      this.profileOutcome.set({ kind: 'error', code: errorCode(error) });
    }
  }

  protected async changePassword(
    formElement: HTMLFormElement,
    directive: FormGroupDirective,
  ): Promise<void> {
    this.passwordOutcome.set(null);
    if (!readyToSubmit(this.passwordForm, formElement)) return;
    try {
      this.auth.setSession(await this.api.changePassword(this.passwordForm.getRawValue()));
      // Clears the fields and the "submitted" state, so no errors show on the empty form.
      directive.resetForm();
      this.passwordOutcome.set({ kind: 'success' });
    } catch (error) {
      this.passwordOutcome.set({ kind: 'error', code: errorCode(error) });
    }
  }

  protected async deleteAccount(formElement: HTMLFormElement): Promise<void> {
    this.deleteError.set(null);
    if (!readyToSubmit(this.deleteForm, formElement)) return;

    const data: ConfirmDialogData = {
      title: this.transloco.translate('account.delete.confirmTitle'),
      message: this.transloco.translate('account.delete.confirmMessage'),
      confirmLabel: this.transloco.translate('account.delete.submit'),
      cancelLabel: this.transloco.translate('common.cancel'),
    };
    const confirmed = await firstValueFrom(this.dialog.open(ConfirmDialog, { data }).afterClosed());
    if (!confirmed) return;

    try {
      await this.api.deleteAccount(this.deleteForm.controls.password.value);
      this.auth.clear();
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.deleteError.set(errorCode(error));
    }
  }
}

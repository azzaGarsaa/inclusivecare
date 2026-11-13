import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoDirective } from '@jsverse/transloco';
import { FieldErrorPipe } from './field-error.pipe';

/**
 * Password input with a show/hide button. Being able to check what was typed
 * replaces a "confirm password" field, and pasting and password managers
 * work normally (WCAG 3.3.8).
 */
@Component({
  selector: 'app-password-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    TranslocoDirective,
    FieldErrorPipe,
  ],
  template: `
    <mat-form-field appearance="outline" *transloco="let t">
      <mat-label>{{ label() }}</mat-label>
      <input
        matInput
        [type]="visible() ? 'text' : 'password'"
        [formControl]="control()"
        [attr.autocomplete]="autocomplete()"
        autocapitalize="off"
        spellcheck="false"
        required
      />
      <button
        matButton
        matSuffix
        type="button"
        [attr.aria-pressed]="visible()"
        (click)="visible.set(!visible())"
      >
        {{ visible() ? t('fields.hidePassword') : t('fields.showPassword') }}
      </button>
      @if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
      <mat-error>{{ control().errors | fieldError }}</mat-error>
    </mat-form-field>
  `,
  styles: `
    :host {
      display: block;
    }
    mat-form-field {
      width: 100%;
    }
    button {
      margin-inline-end: 0.25rem;
    }
  `,
})
export class PasswordField {
  readonly control = input.required<FormControl<string>>();
  readonly label = input.required<string>();
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');
  readonly hint = input<string>();

  protected readonly visible = signal(false);
}

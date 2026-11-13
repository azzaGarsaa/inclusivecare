import { FormGroup, Validators } from '@angular/forms';

/** The same limits the API enforces, so most mistakes are caught before a round trip. */
export const emailValidators = [Validators.required, Validators.email, Validators.maxLength(254)];
export const nameValidators = [Validators.required, Validators.maxLength(80)];
export const newPasswordValidators = [
  Validators.required,
  Validators.minLength(10),
  Validators.maxLength(128),
];
export const currentPasswordValidators = [Validators.required, Validators.maxLength(128)];

/**
 * Returns true when the form can be sent. Otherwise reveals every error and
 * moves focus to the first field that needs attention (WCAG 3.3.1), instead
 * of leaving the user to hunt for it.
 */
export function readyToSubmit(form: FormGroup, formElement: HTMLFormElement): boolean {
  if (form.valid) return true;
  form.markAllAsTouched();
  formElement
    .querySelector<HTMLElement>('input.ng-invalid, select.ng-invalid, textarea.ng-invalid')
    ?.focus();
  return false;
}

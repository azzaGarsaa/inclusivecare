import { inject, Pipe, PipeTransform } from '@angular/core';
import { ValidationErrors } from '@angular/forms';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Turns a control's validation errors into one translated sentence.
 * Impure so the message follows language changes.
 */
@Pipe({ name: 'fieldError', pure: false })
export class FieldErrorPipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(errors: ValidationErrors | null): string {
    if (!errors) return '';
    if (errors['required']) return this.transloco.translate('validation.required');
    if (errors['email']) return this.transloco.translate('validation.email');
    if (errors['minlength']) {
      return this.transloco.translate('validation.minLength', {
        min: errors['minlength'].requiredLength,
      });
    }
    if (errors['maxlength']) {
      return this.transloco.translate('validation.maxLength', {
        max: errors['maxlength'].requiredLength,
      });
    }
    return this.transloco.translate('validation.invalid');
  }
}

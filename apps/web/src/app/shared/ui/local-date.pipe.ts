import { inject, Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';

/** Formats an ISO date in the interface language. Impure so it follows language changes. */
@Pipe({ name: 'localDate', pure: false })
export class LocalDatePipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(value: string | null | undefined, style: 'date' | 'datetime' = 'date'): string {
    if (!value) return '';
    return new Intl.DateTimeFormat(this.language.lang(), {
      dateStyle: 'medium',
      timeStyle: style === 'datetime' ? 'short' : undefined,
    }).format(new Date(value));
  }
}

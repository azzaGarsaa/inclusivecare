import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { API, Data, Locale, User } from '../api/models';
import { AuthService } from '../auth/auth.service';

export const LANGUAGES: readonly { code: Locale; name: string }[] = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية' },
];

const STORAGE_KEY = 'ic.lang';
const RTL: readonly Locale[] = ['ar'];

const isLocale = (value: unknown): value is Locale => LANGUAGES.some((l) => l.code === value);

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly current = signal<Locale>(this.initialLanguage());

  readonly lang = this.current.asReadonly();
  readonly dir = computed(() => (RTL.includes(this.current()) ? 'rtl' : 'ltr'));

  constructor() {
    // Keep <html lang dir> in step with the language, for screen readers and layout.
    effect(() => {
      const root = this.document.documentElement;
      root.lang = this.current();
      root.dir = this.dir();
    });

    // After signing in, use the language saved on the account.
    effect(() => {
      const locale = this.auth.user()?.locale;
      if (locale) untracked(() => this.apply(locale));
    });
  }

  /** Loads the translations for the starting language before the first render. */
  async init(): Promise<void> {
    this.transloco.setActiveLang(this.current());
    await firstValueFrom(this.transloco.load(this.current()));
  }

  /** Switches language and, for signed-in users, saves the choice so emails use it too. */
  async use(lang: Locale): Promise<void> {
    this.apply(lang);
    if (this.auth.isSignedIn() && this.auth.user()?.locale !== lang) {
      try {
        const { data } = await firstValueFrom(
          this.http.patch<Data<User>>(`${API}/me`, { locale: lang }),
        );
        this.auth.setUser(data);
      } catch {
        // The interface language has changed already; saving it is best-effort.
      }
    }
  }

  private apply(lang: Locale): void {
    if (lang === this.current()) return;
    this.current.set(lang);
    this.transloco.setActiveLang(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage unavailable: the choice lasts for this visit only.
    }
  }

  private initialLanguage(): Locale {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored)) return stored;
    } catch {
      // fall through to the browser language
    }
    const browser = (typeof navigator !== 'undefined' ? navigator.language : '')
      .slice(0, 2)
      .toLowerCase();
    return isLocale(browser) ? browser : 'fr';
  }
}

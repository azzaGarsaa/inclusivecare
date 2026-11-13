import { Dir } from '@angular/cdk/bidi';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  Injector,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { filter, skip } from 'rxjs';
import { Locale } from './core/api/models';
import { AuthService } from './core/auth/auth.service';
import { LANGUAGES, LanguageService } from './core/i18n/language.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, TranslocoDirective, Dir],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  protected readonly languages = LANGUAGES;
  protected readonly year = new Date().getFullYear();

  constructor() {
    // A single-page app does not reload on navigation, so nothing tells
    // assistive technology that the page changed. Moving focus to the new
    // page's heading does. The first navigation is skipped: on initial load
    // the browser's own behaviour is the right one.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        afterNextRender(
          () => (document.getElementById('page-title') ?? document.getElementById('main'))?.focus(),
          {
            injector: this.injector,
          },
        );
      });
  }

  protected skipToContent(event: Event): void {
    event.preventDefault();
    document.getElementById('main')?.focus();
  }

  protected changeLanguage(event: Event): void {
    void this.language.use((event.target as HTMLSelectElement).value as Locale);
  }

  protected async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }
}

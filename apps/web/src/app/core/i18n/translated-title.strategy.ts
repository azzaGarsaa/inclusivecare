import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { BehaviorSubject, of, switchMap } from 'rxjs';

const APP_NAME = 'InclusiveCare';

/**
 * Route titles are translation keys. The document title is the first thing a
 * screen reader announces on a new page, so it follows the active language.
 */
@Injectable()
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);
  private readonly key = new BehaviorSubject<string | undefined>(undefined);

  constructor() {
    super();
    this.key
      .pipe(switchMap((key) => (key ? this.transloco.selectTranslate<string>(key) : of(''))))
      .subscribe((text) => this.title.setTitle(text ? `${text} | ${APP_NAME}` : APP_NAME));
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.key.next(this.buildTitle(snapshot));
  }
}

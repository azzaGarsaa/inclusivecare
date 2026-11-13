import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { TranslocoDirective } from '@jsverse/transloco';
import { AccessibilityService, FONT_SCALES } from '../../core/a11y/accessibility.service';
import { PageHeading } from '../../shared/ui/page-heading';

/** Display settings. Each change applies immediately, so there is no save button. */
@Component({
  selector: 'app-accessibility-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, MatRadioModule, MatCheckboxModule, MatButtonModule, PageHeading],
  template: `
    <section class="narrow stack" *transloco="let t">
      <app-page-heading>{{ t('a11y.title') }}</app-page-heading>
      <p>{{ t('a11y.intro') }}</p>

      <fieldset>
        <legend>{{ t('a11y.fontScale.legend') }}</legend>
        <mat-radio-group
          [value]="settings().fontScale"
          (change)="a11y.update({ fontScale: $event.value })"
        >
          @for (scale of fontScales; track scale) {
            <mat-radio-button [value]="scale">{{ t('a11y.fontScale.' + scale) }}</mat-radio-button>
          }
        </mat-radio-group>
      </fieldset>

      <fieldset>
        <legend>{{ t('a11y.contrast.legend') }}</legend>
        <mat-radio-group
          [value]="settings().contrast"
          (change)="a11y.update({ contrast: $event.value })"
        >
          <mat-radio-button value="default">{{ t('a11y.contrast.default') }}</mat-radio-button>
          <mat-radio-button value="high">{{ t('a11y.contrast.high') }}</mat-radio-button>
        </mat-radio-group>
      </fieldset>

      <fieldset>
        <legend>{{ t('a11y.other.legend') }}</legend>
        <mat-checkbox
          [checked]="settings().reducedMotion"
          (change)="a11y.update({ reducedMotion: $event.checked })"
        >
          {{ t('a11y.other.reducedMotion') }}
        </mat-checkbox>
        <mat-checkbox
          [checked]="settings().simplified"
          (change)="a11y.update({ simplified: $event.checked })"
        >
          {{ t('a11y.other.simplified') }}
        </mat-checkbox>
      </fieldset>

      <p class="muted" role="status">{{ t('a11y.savedAutomatically') }}</p>
      <button matButton="outlined" type="button" (click)="a11y.reset()">
        {{ t('a11y.reset') }}
      </button>
    </section>
  `,
  styles: `
    fieldset {
      margin: 0;
      padding: 1rem 1.25rem;
      border: 1px solid var(--ic-border);
      border-radius: var(--ic-radius);
    }
    legend {
      padding-inline: 0.5rem;
      font-weight: 700;
    }
    mat-radio-group,
    fieldset {
      display: flex;
      flex-direction: column;
    }
  `,
})
export class AccessibilityPage {
  protected readonly a11y = inject(AccessibilityService);
  protected readonly settings = this.a11y.settings;
  protected readonly fontScales = FONT_SCALES;
}

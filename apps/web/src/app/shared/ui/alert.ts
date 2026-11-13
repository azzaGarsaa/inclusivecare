import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * An inline message that stays on screen until the situation changes.
 * Errors interrupt screen readers (role="alert"); other kinds wait their turn.
 */
@Component({
  selector: 'app-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.role]': 'role()',
    '[class]': '"alert alert-" + kind()',
  },
  template: `<ng-content />`,
  styles: `
    :host {
      display: block;
      padding: 0.875rem 1rem;
      border-radius: var(--ic-radius);
      border: 1px solid currentColor;
      border-inline-start-width: 0.375rem;
      font-weight: 500;
    }
    :host(.alert-error) {
      background: var(--ic-error-bg);
      color: var(--ic-error-text);
    }
    :host(.alert-success) {
      background: var(--ic-success-bg);
      color: var(--ic-success-text);
    }
    :host(.alert-info) {
      background: var(--ic-info-bg);
      color: var(--ic-info-text);
    }
  `,
})
export class Alert {
  readonly kind = input<'error' | 'success' | 'info'>('info');
  protected readonly role = computed(() => (this.kind() === 'error' ? 'alert' : 'status'));
}

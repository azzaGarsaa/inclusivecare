import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccessibilitySettings, API, Data, User } from '../api/models';
import { AuthService } from '../auth/auth.service';

export const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontScale: 100,
  contrast: 'default',
  reducedMotion: false,
  simplified: false,
};

export const FONT_SCALES: readonly AccessibilitySettings['fontScale'][] = [100, 112, 125, 150];

const STORAGE_KEY = 'ic.a11y';

/**
 * Display settings chosen by the user. They are applied as attributes on
 * <html>, which the global stylesheet reacts to; remembered on the device;
 * and saved to the account so they follow the user to other devices.
 */
@Injectable({ providedIn: 'root' })
export class AccessibilityService {
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly current = signal<AccessibilitySettings>(this.load());
  readonly settings = this.current.asReadonly();

  constructor() {
    effect(() => this.applyToDocument(this.current()));

    // After signing in, adopt the settings saved on the account, if any.
    effect(() => {
      const saved = this.auth.user()?.accessibility;
      if (saved) untracked(() => this.store(saved));
    });
  }

  async update(changes: Partial<AccessibilitySettings>): Promise<void> {
    const next = { ...this.current(), ...changes };
    this.store(next);

    if (!this.auth.isSignedIn()) return;
    try {
      const { data } = await firstValueFrom(
        this.http.put<Data<User>>(`${API}/me/accessibility`, next),
      );
      this.auth.setUser(data);
    } catch {
      // Already applied and stored on this device; syncing is best-effort.
    }
  }

  reset(): Promise<void> {
    return this.update(DEFAULT_SETTINGS);
  }

  private store(settings: AccessibilitySettings): void {
    this.current.set(settings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage unavailable: the settings last for this visit only.
    }
  }

  private applyToDocument(settings: AccessibilitySettings): void {
    const root = this.document.documentElement;
    root.style.fontSize = `${settings.fontScale}%`;
    root.dataset['contrast'] = settings.contrast;
    root.dataset['reducedMotion'] = String(settings.reducedMotion);
    root.dataset['simplified'] = String(settings.simplified);
  }

  private load(): AccessibilitySettings {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (stored && typeof stored === 'object') {
        const candidate = { ...DEFAULT_SETTINGS, ...stored } as AccessibilitySettings;
        if (
          FONT_SCALES.includes(candidate.fontScale) &&
          ['default', 'high'].includes(candidate.contrast)
        ) {
          return {
            fontScale: candidate.fontScale,
            contrast: candidate.contrast,
            reducedMotion: candidate.reducedMotion === true,
            simplified: candidate.simplified === true,
          };
        }
      }
    } catch {
      // Missing or corrupt value: use the defaults.
    }
    return DEFAULT_SETTINGS;
  }
}

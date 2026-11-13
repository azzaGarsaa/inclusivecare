import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API, Data, LoginRequest, Session, User } from '../api/models';

/**
 * Remembers, per browser, that a session probably exists. It holds no secret:
 * it only saves visitors who never signed in a pointless refresh call.
 */
const SESSION_HINT = 'ic.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly currentUser = signal<User | null>(null);
  /** Kept in memory only, never in web storage, so injected scripts cannot read it later. */
  private accessToken: string | null = null;
  private refreshInFlight: Promise<boolean> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly isSignedIn = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.roles.includes('ADMIN') ?? false);

  token(): string | null {
    return this.accessToken;
  }

  /** Called once at startup: picks the session back up after a page reload. */
  async restore(): Promise<void> {
    if (this.hasSessionHint()) await this.refresh();
  }

  async login(credentials: LoginRequest): Promise<User> {
    const { data } = await firstValueFrom(
      this.http.post<Data<Session>>(`${API}/auth/login`, credentials),
    );
    this.setSession(data);
    return data.user;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>(`${API}/auth/logout`, null));
    } finally {
      this.clear();
    }
  }

  /**
   * Gets a new access token using the refresh cookie. Concurrent callers share
   * one request, and a Web Lock makes other tabs wait their turn, because each
   * refresh token can be used only once.
   */
  refresh(): Promise<boolean> {
    this.refreshInFlight ??= this.withTabLock(() => this.requestRefresh()).finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  setSession(session: Session): void {
    this.accessToken = session.accessToken;
    this.currentUser.set(session.user);
    this.writeSessionHint(true);
  }

  setUser(user: User): void {
    this.currentUser.set(user);
  }

  clear(): void {
    this.accessToken = null;
    this.currentUser.set(null);
    this.writeSessionHint(false);
  }

  private async requestRefresh(): Promise<boolean> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<Data<Session>>(`${API}/auth/refresh`, null),
      );
      this.setSession(data);
      return true;
    } catch {
      this.clear();
      return false;
    }
  }

  private withTabLock<T>(task: () => Promise<T>): Promise<T> {
    if (typeof navigator === 'undefined' || !navigator.locks) return task();
    return navigator.locks.request('ic.auth.refresh', task) as Promise<T>;
  }

  private hasSessionHint(): boolean {
    try {
      return localStorage.getItem(SESSION_HINT) === '1';
    } catch {
      return true;
    }
  }

  private writeSessionHint(present: boolean): void {
    try {
      if (present) localStorage.setItem(SESSION_HINT, '1');
      else localStorage.removeItem(SESSION_HINT);
    } catch {
      // Storage can be unavailable (private mode); the hint is optional.
    }
  }
}

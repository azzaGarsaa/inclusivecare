import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API, RegisterRequest } from '../../core/api/models';

/** Account creation and recovery calls. Signing in and out live in AuthService. */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  register(request: RegisterRequest): Promise<void> {
    return this.post('register', request);
  }

  verifyEmail(token: string): Promise<void> {
    return this.post('verify-email', { token });
  }

  resendVerification(email: string): Promise<void> {
    return this.post('resend-verification', { email });
  }

  forgotPassword(email: string): Promise<void> {
    return this.post('forgot-password', { email });
  }

  resetPassword(token: string, password: string): Promise<void> {
    return this.post('reset-password', { token, password });
  }

  private post(path: string, body: unknown): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${API}/auth/${path}`, body));
  }
}

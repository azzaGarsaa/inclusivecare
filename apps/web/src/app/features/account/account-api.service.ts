import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  API,
  ChangePasswordRequest,
  Data,
  Session,
  UpdateProfileRequest,
  User,
} from '../../core/api/models';

@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private readonly http = inject(HttpClient);

  async updateProfile(changes: UpdateProfileRequest): Promise<User> {
    return (await firstValueFrom(this.http.patch<Data<User>>(`${API}/me`, changes))).data;
  }

  /** The API signs out other devices and answers with a fresh session for this one. */
  async changePassword(request: ChangePasswordRequest): Promise<Session> {
    return (await firstValueFrom(this.http.post<Data<Session>>(`${API}/me/password`, request)))
      .data;
  }

  deleteAccount(password: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${API}/me/delete`, { password }));
  }
}

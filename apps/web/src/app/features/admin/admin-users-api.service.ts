import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API, Data, Paged, Role, User, UserStatus } from '../../core/api/models';

export interface UserQuery {
  page: number;
  pageSize: number;
  search?: string;
  role?: Role;
  status?: UserStatus;
}

@Injectable({ providedIn: 'root' })
export class AdminUsersApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API}/admin/users`;

  list(query: UserQuery): Promise<Paged<User>> {
    let params = new HttpParams().set('page', query.page).set('pageSize', query.pageSize);
    if (query.search) params = params.set('search', query.search);
    if (query.role) params = params.set('role', query.role);
    if (query.status) params = params.set('status', query.status);
    return firstValueFrom(this.http.get<Paged<User>>(this.url, { params }));
  }

  async get(id: string): Promise<User> {
    return (await firstValueFrom(this.http.get<Data<User>>(`${this.url}/${id}`))).data;
  }

  async setRoles(id: string, roles: Role[]): Promise<User> {
    return (await firstValueFrom(this.http.put<Data<User>>(`${this.url}/${id}/roles`, { roles })))
      .data;
  }

  async setStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<User> {
    return (
      await firstValueFrom(this.http.patch<Data<User>>(`${this.url}/${id}/status`, { status }))
    ).data;
  }
}

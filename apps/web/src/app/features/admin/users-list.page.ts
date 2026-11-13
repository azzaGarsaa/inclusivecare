import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { errorCode } from '../../core/api/api-error';
import { PageMeta, Role, User, UserStatus } from '../../core/api/models';
import { Alert } from '../../shared/ui/alert';
import { LocalDatePipe } from '../../shared/ui/local-date.pipe';
import { PageHeading } from '../../shared/ui/page-heading';
import { AdminUsersApiService } from './admin-users-api.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-users-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoDirective,
    MatButtonModule,
    PageHeading,
    Alert,
    LocalDatePipe,
  ],
  template: `
    <ng-container *transloco="let t">
      <app-page-heading>{{ t('adminUsers.title') }}</app-page-heading>

      <form
        class="filters"
        [formGroup]="filters"
        (ngSubmit)="search()"
        role="search"
        [attr.aria-label]="t('adminUsers.filters')"
      >
        <div class="filter">
          <label for="user-search">{{ t('adminUsers.search') }}</label>
          <input id="user-search" type="search" formControlName="search" maxlength="100" />
        </div>
        <div class="filter">
          <label for="user-role">{{ t('adminUsers.role') }}</label>
          <select id="user-role" formControlName="role">
            <option value="">{{ t('adminUsers.any') }}</option>
            @for (role of roles; track role) {
              <option [value]="role">{{ t('roles.' + role) }}</option>
            }
          </select>
        </div>
        <div class="filter">
          <label for="user-status">{{ t('adminUsers.status') }}</label>
          <select id="user-status" formControlName="status">
            <option value="">{{ t('adminUsers.any') }}</option>
            @for (status of statuses; track status) {
              <option [value]="status">{{ t('statuses.' + status) }}</option>
            }
          </select>
        </div>
        <button matButton="filled" type="submit">{{ t('adminUsers.apply') }}</button>
      </form>

      @if (error(); as code) {
        <app-alert kind="error">{{ t('errors.' + code) }}</app-alert>
      }

      <!-- Announces the outcome of a search or page change to screen readers. -->
      <p role="status" class="result-count">
        @if (meta(); as m) {
          {{ t('adminUsers.resultCount', { total: m.total }) }}
        } @else {
          {{ t('common.loading') }}
        }
      </p>

      @if (users().length > 0) {
        <!-- Scrolls sideways on small screens; focusable so keyboard users can scroll it too. -->
        <div
          class="table-scroll"
          tabindex="0"
          role="region"
          [attr.aria-label]="t('adminUsers.title')"
        >
          <table>
            <thead>
              <tr>
                <th scope="col">{{ t('adminUsers.columns.name') }}</th>
                <th scope="col">{{ t('fields.email') }}</th>
                <th scope="col">{{ t('adminUsers.role') }}</th>
                <th scope="col">{{ t('adminUsers.status') }}</th>
                <th scope="col">{{ t('adminUsers.columns.created') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <th scope="row">
                    <a [routerLink]="['/admin/users', user.id]"
                      >{{ user.firstName }} {{ user.lastName }}</a
                    >
                  </th>
                  <td dir="ltr">{{ user.email }}</td>
                  <td>
                    @for (role of user.roles; track role; let last = $last) {
                      {{ t('roles.' + role) }}{{ last ? '' : ', ' }}
                    }
                  </td>
                  <td>{{ t('statuses.' + user.status) }}</td>
                  <td>{{ user.createdAt | localDate }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (meta(); as m) {
        @if (m.totalPages > 1) {
          <nav class="cluster pager" [attr.aria-label]="t('adminUsers.pagination')">
            <button
              matButton="outlined"
              type="button"
              [disabled]="m.page <= 1"
              (click)="load(m.page - 1)"
            >
              {{ t('common.previous') }}
            </button>
            <span>{{ t('common.pageOf', { page: m.page, total: m.totalPages }) }}</span>
            <button
              matButton="outlined"
              type="button"
              [disabled]="m.page >= m.totalPages"
              (click)="load(m.page + 1)"
            >
              {{ t('common.next') }}
            </button>
          </nav>
        }
      }
    </ng-container>
  `,
  styles: `
    .filters {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: 1rem;
      margin-block: 1rem 1.5rem;
    }
    .filter {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 12rem;
    }
    .filter label {
      font-weight: 600;
    }
    .filter input,
    .filter select {
      min-height: 2.75rem;
      padding-inline: 0.75rem;
      font: inherit;
      color: var(--ic-text);
      background: var(--ic-surface);
      border: 1px solid var(--ic-border);
      border-radius: 0.5rem;
    }
    .table-scroll {
      overflow-x: auto;
      border: 1px solid var(--ic-border);
      border-radius: var(--ic-radius);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th,
    td {
      padding: 0.75rem 1rem;
      text-align: start;
      white-space: nowrap;
    }
    thead th {
      background: var(--ic-surface-soft);
    }
    tbody tr {
      border-block-start: 1px solid var(--ic-border);
    }
    tbody th {
      font-weight: 600;
    }
    .pager {
      margin-block-start: 1rem;
    }
  `,
})
export class UsersListPage {
  private readonly api = inject(AdminUsersApiService);

  protected readonly roles: Role[] = ['USER', 'MODERATOR', 'ADMIN'];
  protected readonly statuses: UserStatus[] = ['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED'];

  protected readonly filters = inject(NonNullableFormBuilder).group({
    search: [''],
    role: ['' as Role | ''],
    status: ['' as UserStatus | ''],
  });
  protected readonly users = signal<User[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    void this.load(1);
  }

  protected search(): Promise<void> {
    return this.load(1);
  }

  protected async load(page: number): Promise<void> {
    const { search, role, status } = this.filters.getRawValue();
    this.error.set(null);
    try {
      const result = await this.api.list({
        page,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
        role: role || undefined,
        status: status || undefined,
      });
      this.users.set(result.data);
      this.meta.set(result.meta);
    } catch (error) {
      this.error.set(errorCode(error));
    }
  }
}

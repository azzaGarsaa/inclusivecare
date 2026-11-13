import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { errorCode } from '../../core/api/api-error';
import { Role, User } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { Alert } from '../../shared/ui/alert';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/ui/confirm-dialog';
import { LocalDatePipe } from '../../shared/ui/local-date.pipe';
import { PageHeading } from '../../shared/ui/page-heading';
import { AdminUsersApiService } from './admin-users-api.service';

/** Roles an administrator can grant. USER is implicit and cannot be removed. */
const ELEVATED_ROLES: Role[] = ['MODERATOR', 'ADMIN'];

@Component({
  selector: 'app-user-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslocoDirective,
    MatButtonModule,
    MatCheckboxModule,
    PageHeading,
    Alert,
    LocalDatePipe,
  ],
  template: `
    <div class="narrow stack" *transloco="let t">
      <p>
        <a routerLink="/admin/users">{{ t('adminUser.back') }}</a>
      </p>

      @if (user(); as u) {
        <app-page-heading>{{ u.firstName }} {{ u.lastName }}</app-page-heading>

        <dl>
          <dt>{{ t('fields.email') }}</dt>
          <dd dir="ltr">{{ u.email }}</dd>
          <dt>{{ t('adminUsers.status') }}</dt>
          <dd>{{ t('statuses.' + u.status) }}</dd>
          <dt>{{ t('adminUsers.columns.created') }}</dt>
          <dd>{{ u.createdAt | localDate }}</dd>
          <dt>{{ t('adminUser.lastLogin') }}</dt>
          <dd>
            {{ u.lastLoginAt ? (u.lastLoginAt | localDate: 'datetime') : t('adminUser.never') }}
          </dd>
        </dl>

        @if (message(); as m) {
          <app-alert [kind]="m.kind">{{ t(m.key) }}</app-alert>
        }

        @if (isSelf()) {
          <app-alert kind="info">{{ t('adminUser.selfNotice') }}</app-alert>
        } @else {
          <section class="stack" aria-labelledby="roles-title">
            <h2 id="roles-title">{{ t('adminUser.rolesTitle') }}</h2>
            <fieldset>
              <legend class="sr-only">{{ t('adminUser.rolesTitle') }}</legend>
              <mat-checkbox checked disabled>{{ t('roles.USER') }}</mat-checkbox>
              @for (role of elevatedRoles; track role) {
                <mat-checkbox
                  [checked]="selectedRoles().includes(role)"
                  (change)="toggleRole(role, $event.checked)"
                >
                  {{ t('roles.' + role) }}
                </mat-checkbox>
              }
            </fieldset>
            <button matButton="filled" type="button" (click)="saveRoles(u)">
              {{ t('adminUser.saveRoles') }}
            </button>
          </section>

          @if (u.status === 'ACTIVE' || u.status === 'SUSPENDED') {
            <section class="stack" aria-labelledby="access-title">
              <h2 id="access-title">{{ t('adminUser.accessTitle') }}</h2>
              @if (u.status === 'ACTIVE') {
                <p>{{ t('adminUser.suspendHelp') }}</p>
                <button matButton="outlined" type="button" (click)="suspend(u)">
                  {{ t('adminUser.suspend') }}
                </button>
              } @else {
                <p>{{ t('adminUser.reactivateHelp') }}</p>
                <button matButton="outlined" type="button" (click)="setStatus(u, 'ACTIVE')">
                  {{ t('adminUser.reactivate') }}
                </button>
              }
            </section>
          }
        }
      } @else if (loadError(); as code) {
        <app-page-heading>{{ t('titles.adminUser') }}</app-page-heading>
        <app-alert kind="error">{{ t('errors.' + code) }}</app-alert>
      } @else {
        <p role="status">{{ t('common.loading') }}</p>
      }
    </div>
  `,
  styles: `
    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.5rem 1.5rem;
      margin: 0;
    }
    dt {
      font-weight: 600;
    }
    dd {
      margin: 0;
      text-align: start;
    }
    fieldset {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      border: 0;
    }
    section {
      padding-block-start: 1.5rem;
      border-block-start: 1px solid var(--ic-border);
    }
  `,
})
export class UserDetailPage implements OnInit {
  private readonly api = inject(AdminUsersApiService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly transloco = inject(TranslocoService);

  /** Route parameter, bound by the router. */
  readonly id = input.required<string>();

  protected readonly elevatedRoles = ELEVATED_ROLES;
  protected readonly user = signal<User | null>(null);
  protected readonly selectedRoles = signal<Role[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly message = signal<{ kind: 'success' | 'error'; key: string } | null>(null);
  protected readonly isSelf = computed(() => this.auth.user()?.id === this.id());

  async ngOnInit(): Promise<void> {
    try {
      this.show(await this.api.get(this.id()));
    } catch (error) {
      this.loadError.set(errorCode(error));
    }
  }

  protected toggleRole(role: Role, checked: boolean): void {
    this.selectedRoles.update((roles) =>
      checked ? [...roles, role] : roles.filter((r) => r !== role),
    );
  }

  protected saveRoles(user: User): Promise<void> {
    return this.apply(
      () => this.api.setRoles(user.id, ['USER', ...this.selectedRoles()]),
      'adminUser.rolesSaved',
    );
  }

  protected async suspend(user: User): Promise<void> {
    const data: ConfirmDialogData = {
      title: this.transloco.translate('adminUser.suspendConfirmTitle'),
      message: this.transloco.translate('adminUser.suspendConfirmMessage', {
        name: `${user.firstName} ${user.lastName}`,
      }),
      confirmLabel: this.transloco.translate('adminUser.suspend'),
      cancelLabel: this.transloco.translate('common.cancel'),
    };
    const confirmed = await firstValueFrom(this.dialog.open(ConfirmDialog, { data }).afterClosed());
    if (confirmed) await this.setStatus(user, 'SUSPENDED');
  }

  protected setStatus(user: User, status: 'ACTIVE' | 'SUSPENDED'): Promise<void> {
    const key = status === 'SUSPENDED' ? 'adminUser.suspended' : 'adminUser.reactivated';
    return this.apply(() => this.api.setStatus(user.id, status), key);
  }

  private async apply(change: () => Promise<User>, successKey: string): Promise<void> {
    this.message.set(null);
    try {
      this.show(await change());
      this.message.set({ kind: 'success', key: successKey });
    } catch (error) {
      this.message.set({ kind: 'error', key: `errors.${errorCode(error)}` });
    }
  }

  private show(user: User): void {
    this.user.set(user);
    this.selectedRoles.set(user.roles.filter((role) => ELEVATED_ROLES.includes(role)));
  }
}

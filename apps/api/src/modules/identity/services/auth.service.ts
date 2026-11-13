import { Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-codes.js';
import { Locale, OneTimeTokenPurpose, UserStatus } from '../../../generated/prisma/client.js';
import { AuditService } from '../../audit/audit.service.js';
import type { RequestOrigin } from '../authenticated-user.js';
import type { LoginDto, RegisterDto, SessionDto } from '../dto/auth.dto.js';
import { UserDto } from '../dto/user.dto.js';
import { AuthMailer } from '../mail/auth-mailer.js';
import { UsersRepository, UserWithRoles } from '../repositories/users.repository.js';
import { OneTimeTokenService } from './one-time-token.service.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

/** Version of the terms and privacy policy accepted at registration. */
export const CONSENT_VERSION = '2026-11';

export interface IssuedSession extends SessionDto {
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly oneTimeTokens: OneTimeTokenService,
    private readonly mail: AuthMailer,
    private readonly audit: AuditService,
  ) {}

  /**
   * Always succeeds from the caller's point of view. Whether the address was
   * already registered is only ever disclosed to the owner of the mailbox.
   */
  async register(dto: RegisterDto, origin: RequestOrigin): Promise<void> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      if (existing.status === UserStatus.PENDING_VERIFICATION) {
        await this.sendVerification(existing);
      } else {
        this.mail.sendAlreadyRegistered(existing);
      }
      return;
    }

    const user = await this.users.create({
      email: dto.email,
      passwordHash: await this.passwords.hash(dto.password),
      firstName: dto.firstName,
      lastName: dto.lastName,
      locale: dto.locale ?? Locale.fr,
      consentVersion: CONSENT_VERSION,
      ipAddress: origin.ipAddress,
    });
    await this.sendVerification(user);
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.oneTimeTokens.consume(token, OneTimeTokenPurpose.EMAIL_VERIFICATION);
    await this.activateIfPending(userId);
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (user?.status === UserStatus.PENDING_VERIFICATION) await this.sendVerification(user);
  }

  async login(dto: LoginDto, origin: RequestOrigin): Promise<IssuedSession> {
    const invalid = () =>
      AppException.unauthenticated('The email address or password is incorrect.', ErrorCode.InvalidCredentials);

    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      await this.passwords.verifyAgainstDummy(dto.password);
      throw invalid();
    }
    if (!(await this.passwords.verify(user.passwordHash, dto.password))) throw invalid();

    // Account state is only revealed once the password has been proven.
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw AppException.forbidden('Please confirm your email address first.', ErrorCode.EmailNotVerified);
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw AppException.forbidden('This account has been suspended.', ErrorCode.AccountSuspended);
    }
    if (user.status !== UserStatus.ACTIVE) throw invalid();

    const signedIn = await this.users.update(user.id, { lastLoginAt: new Date() });
    return this.issueSession(signedIn, await this.tokens.startSession(user.id, origin));
  }

  async refresh(refreshToken: string, origin: RequestOrigin): Promise<IssuedSession> {
    const rotated = await this.tokens.rotate(refreshToken, origin);
    const user = await this.users.findById(rotated.userId);
    if (user?.status !== UserStatus.ACTIVE) {
      await this.tokens.revoke(rotated.refreshToken);
      throw AppException.unauthenticated('Your session has expired.', ErrorCode.TokenInvalid);
    }
    return this.issueSession(user, rotated.refreshToken);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) await this.tokens.revoke(refreshToken);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) return;
    if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.PENDING_VERIFICATION) return;

    const token = await this.oneTimeTokens.issue(user.id, OneTimeTokenPurpose.PASSWORD_RESET);
    this.mail.sendPasswordReset(user, token);
  }

  async resetPassword(token: string, newPassword: string, origin: RequestOrigin): Promise<void> {
    const userId = await this.oneTimeTokens.consume(token, OneTimeTokenPurpose.PASSWORD_RESET);

    await this.users.update(userId, { passwordHash: await this.passwords.hash(newPassword) });
    // Whoever knew the old password, or held a session, is signed out.
    await this.tokens.revokeAllForUser(userId);
    // Following the emailed link also proves ownership of the address.
    await this.activateIfPending(userId);

    await this.audit.record({
      actorId: userId,
      action: 'user.password.reset',
      targetType: 'user',
      targetId: userId,
      ipAddress: origin.ipAddress,
    });
  }

  /** Used after a password change to keep the current device signed in. */
  async startSession(userId: string, origin: RequestOrigin): Promise<IssuedSession> {
    const user = await this.users.findById(userId);
    if (!user) throw AppException.unauthenticated();
    return this.issueSession(user, await this.tokens.startSession(userId, origin));
  }

  private async issueSession(user: UserWithRoles, refreshToken: string): Promise<IssuedSession> {
    const access = await this.tokens.issueAccessToken(user.id);
    return { ...access, user: UserDto.from(user), refreshToken };
  }

  private async sendVerification(user: UserWithRoles): Promise<void> {
    const token = await this.oneTimeTokens.issue(user.id, OneTimeTokenPurpose.EMAIL_VERIFICATION);
    this.mail.sendVerification(user, token);
  }

  private async activateIfPending(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (user?.status === UserStatus.PENDING_VERIFICATION) {
      await this.users.update(userId, { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() });
    }
  }
}

import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { appConfig } from '../../../config/app.config.js';
import { generateToken, hashToken } from '../../../common/crypto/tokens.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-codes.js';
import type { RequestOrigin } from '../authenticated-user.js';
import { RefreshTokensRepository } from '../repositories/refresh-tokens.repository.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Two browser tabs can send the same refresh token within moments of each
 * other. Inside this window the second request is refused but not treated as
 * theft; the tab simply retries with the cookie the first response set.
 */
const ROTATION_GRACE_MS = 10_000;

export interface AccessToken {
  accessToken: string;
  expiresIn: number;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokensRepository,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {}

  get refreshTtlMs(): number {
    return this.config.refreshTokenTtlDays * DAY_MS;
  }

  async issueAccessToken(userId: string): Promise<AccessToken> {
    const accessToken = await this.jwt.signAsync({ sub: userId });
    return { accessToken, expiresIn: this.config.jwt.accessTtlSeconds };
  }

  /** Returns the user id, or null if the token is missing, forged or expired. */
  async verifyAccessToken(token: string): Promise<string | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: unknown }>(token);
      return typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  }

  /** Starts a new session (token family) after a successful login. */
  startSession(userId: string, origin: RequestOrigin): Promise<string> {
    return this.issueRefreshToken(userId, randomUUID(), origin);
  }

  /**
   * Exchanges a refresh token for a new one. Each token works once. If a token
   * that was already exchanged shows up again, someone is replaying a stolen
   * copy, so every token of that session is revoked.
   */
  async rotate(rawToken: string, origin: RequestOrigin): Promise<{ userId: string; refreshToken: string }> {
    const invalid = () => AppException.unauthenticated('Your session has expired.', ErrorCode.TokenInvalid);

    const stored = await this.refreshTokens.findByHash(hashToken(rawToken));
    if (!stored) throw invalid();

    if (stored.revokedAt) {
      if (Date.now() - stored.revokedAt.getTime() > ROTATION_GRACE_MS) {
        this.logger.warn(`Refresh token reuse detected for user ${stored.userId}; session revoked`);
        await this.refreshTokens.revokeFamily(stored.familyId);
      }
      throw invalid();
    }

    if (stored.expiresAt.getTime() <= Date.now()) throw invalid();
    if (!(await this.refreshTokens.revokeIfActive(stored.id))) throw invalid();

    const refreshToken = await this.issueRefreshToken(stored.userId, stored.familyId, origin);
    return { userId: stored.userId, refreshToken };
  }

  async revoke(rawToken: string): Promise<void> {
    const stored = await this.refreshTokens.findByHash(hashToken(rawToken));
    if (stored) await this.refreshTokens.revokeFamily(stored.familyId);
  }

  revokeAllForUser(userId: string): Promise<void> {
    return this.refreshTokens.revokeAllForUser(userId);
  }

  private async issueRefreshToken(userId: string, familyId: string, origin: RequestOrigin): Promise<string> {
    const token = generateToken();
    await this.refreshTokens.create({
      userId,
      familyId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + this.refreshTtlMs),
      userAgent: origin.userAgent ?? null,
      ipAddress: origin.ipAddress ?? null,
    });
    return token;
  }
}

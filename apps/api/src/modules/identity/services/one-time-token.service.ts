import { Injectable } from '@nestjs/common';
import { generateToken, hashToken } from '../../../common/crypto/tokens.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-codes.js';
import { OneTimeTokenPurpose } from '../../../generated/prisma/client.js';
import { OneTimeTokensRepository } from '../repositories/one-time-tokens.repository.js';

const HOUR_MS = 60 * 60 * 1000;

const TTL_MS: Record<OneTimeTokenPurpose, number> = {
  [OneTimeTokenPurpose.EMAIL_VERIFICATION]: 24 * HOUR_MS,
  [OneTimeTokenPurpose.PASSWORD_RESET]: HOUR_MS,
};

/** Single-use tokens sent by email (address verification, password reset). */
@Injectable()
export class OneTimeTokenService {
  constructor(private readonly tokens: OneTimeTokensRepository) {}

  async issue(userId: string, purpose: OneTimeTokenPurpose): Promise<string> {
    const token = generateToken();
    await this.tokens.replace(userId, purpose, hashToken(token), new Date(Date.now() + TTL_MS[purpose]));
    return token;
  }

  /** Returns the owner's id and makes the token unusable from then on. */
  async consume(token: string, purpose: OneTimeTokenPurpose): Promise<string> {
    const userId = await this.tokens.consume(hashToken(token), purpose);
    if (!userId) {
      throw AppException.badRequest(ErrorCode.TokenInvalid, 'This link is invalid or has expired.');
    }
    return userId;
  }
}

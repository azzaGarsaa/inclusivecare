import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import type { OneTimeTokenPurpose } from '../../../generated/prisma/client.js';

@Injectable()
export class OneTimeTokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Issuing a new token cancels earlier unused ones for the same purpose. */
  async replace(userId: string, purpose: OneTimeTokenPurpose, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.oneTimeToken.deleteMany({ where: { userId, purpose, consumedAt: null } }),
      this.prisma.oneTimeToken.create({ data: { userId, purpose, tokenHash, expiresAt } }),
    ]);
  }

  /** Marks the token as used and returns its owner, or null if it is not valid any more. */
  async consume(tokenHash: string, purpose: OneTimeTokenPurpose): Promise<string | null> {
    const now = new Date();
    const consumed = await this.prisma.oneTimeToken.updateManyAndReturn({
      where: { tokenHash, purpose, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
      select: { userId: true },
    });
    return consumed[0]?.userId ?? null;
  }
}

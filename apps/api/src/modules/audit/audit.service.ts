import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';

export interface AuditEntry {
  /** Who did it. Null for actions taken by the system. */
  actorId: string | null;
  /** Dotted verb, e.g. `user.roles.updated`. */
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({ data: entry });
  }
}

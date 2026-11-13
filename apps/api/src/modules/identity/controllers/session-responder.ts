import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Response } from 'express';
import { appConfig } from '../../../config/app.config.js';
import type { SessionDto } from '../dto/auth.dto.js';
import type { IssuedSession } from '../services/auth.service.js';
import { TokenService } from '../services/token.service.js';
import { clearRefreshCookie, setRefreshCookie } from './refresh-cookie.js';

/** Splits an issued session into its cookie part and its response body part. */
@Injectable()
export class SessionResponder {
  private readonly secure: boolean;

  constructor(
    private readonly tokens: TokenService,
    @Inject(appConfig.KEY) config: ConfigType<typeof appConfig>,
  ) {
    this.secure = config.nodeEnv === 'production';
  }

  send(response: Response, session: IssuedSession): SessionDto {
    const { refreshToken, ...body } = session;
    setRefreshCookie(response, refreshToken, this.tokens.refreshTtlMs, this.secure);
    return body;
  }

  clear(response: Response): void {
    clearRefreshCookie(response, this.secure);
  }
}

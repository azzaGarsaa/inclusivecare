import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { appConfig } from '../../../config/app.config.js';
import type { Locale } from '../../../generated/prisma/client.js';
import { Mailer } from '../../mail/mailer.js';
import { AuthMailKind, renderAuthMail } from './templates.js';

interface Recipient {
  email: string;
  firstName: string;
  locale: Locale;
}

@Injectable()
export class AuthMailer {
  private readonly logger = new Logger(AuthMailer.name);

  constructor(
    private readonly mailer: Mailer,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {}

  sendVerification(user: Recipient, token: string): void {
    this.deliver('verifyEmail', user, `/auth/verify-email?token=${encodeURIComponent(token)}`);
  }

  sendPasswordReset(user: Recipient, token: string): void {
    this.deliver('resetPassword', user, `/auth/reset-password?token=${encodeURIComponent(token)}`);
  }

  sendAlreadyRegistered(user: Recipient): void {
    this.deliver('alreadyRegistered', user, '/auth/login');
  }

  /**
   * Sent without waiting. The HTTP response must not depend on the mail
   * server, neither in duration (which would reveal whether an address is
   * registered) nor in outcome.
   */
  private deliver(kind: AuthMailKind, user: Recipient, path: string): void {
    const mail = renderAuthMail(kind, user.locale, user.firstName, `${this.config.webUrl}${path}`);
    this.mailer.send({ to: user.email, ...mail }).catch((error: unknown) => {
      this.logger.error(`Could not send ${kind} email: ${error instanceof Error ? error.message : String(error)}`);
    });
  }
}

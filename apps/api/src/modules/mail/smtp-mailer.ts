import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { appConfig } from '../../config/app.config.js';
import { Mailer, MailMessage } from './mailer.js';

@Injectable()
export class SmtpMailer extends Mailer {
  private readonly transport: Transporter;
  private readonly from: string;

  constructor(@Inject(appConfig.KEY) config: ConfigType<typeof appConfig>) {
    super();
    const { host, port, user, password } = config.smtp;
    this.from = config.mailFrom;
    this.transport = createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass: password } : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.from, ...message });
  }
}

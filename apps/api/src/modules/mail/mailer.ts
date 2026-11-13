export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Injection token and contract for sending email. Modules depend on this
 * class, never on the transport, so tests and future providers can replace it.
 */
export abstract class Mailer {
  abstract send(message: MailMessage): Promise<void>;
}

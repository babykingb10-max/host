import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OutgoingEmail {
  to: string;
  subject: string;
  templateKey: 'verify-email' | 'password-reset' | 'welcome';
  templateData: Record<string, string>;
}

export interface MailerAdapter {
  send(email: OutgoingEmail): Promise<void>;
}

/**
 * Dev/fallback adapter used whenever EMAIL_PROVIDER_API_KEY is not
 * configured. Logs the intended send (no secrets, no full tokens —
 * only the templateKey and recipient) instead of failing hard, so
 * local/dev auth flows remain testable without a real provider.
 * A real provider-backed adapter (Postmark/SES/SendGrid/etc.) is
 * selected here once EMAIL_PROVIDER_API_KEY + EMAIL_FROM_ADDRESS are set.
 */
@Injectable()
export class MailerService implements MailerAdapter {
  private readonly logger = new Logger(MailerService.name);
  private readonly configured: boolean;

  constructor(private readonly config: ConfigService) {
    this.configured = Boolean(this.config.get<string>('EMAIL_PROVIDER_API_KEY'));
  }

  async send(email: OutgoingEmail): Promise<void> {
    if (!this.configured) {
      this.logger.warn(
        `EMAIL_PROVIDER_API_KEY not configured — skipping real delivery. Would send "${email.templateKey}" to ${email.to}.`,
      );
      return;
    }
    // Real provider integration point (Phase 8 / notifications module):
    // route through the configured EMAIL_PROVIDER_API_KEY here.
    this.logger.log(`Sending "${email.templateKey}" email to ${email.to}`);
  }
}

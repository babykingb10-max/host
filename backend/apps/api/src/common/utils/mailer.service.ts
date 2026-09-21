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

const RESEND_API_URL = 'https://api.resend.com/emails';

function renderHtml(email: OutgoingEmail, appUrl: string): { html: string; text: string } {
  if (email.templateKey === 'verify-email') {
    const link = `${appUrl}/verify-email?token=${encodeURIComponent(email.templateData.token)}`;
    return {
      html: `<p>Welcome to Adevos-X! Please verify your email address:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
      text: `Welcome to Adevos-X! Verify your email: ${link} (expires in 24 hours)`,
    };
  }
  if (email.templateKey === 'password-reset') {
    const link = `${appUrl}/reset-password?token=${encodeURIComponent(email.templateData.token)}`;
    return {
      html: `<p>Hi ${email.templateData.displayName ?? ''},</p><p>Reset your Adevos-X password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>`,
      text: `Reset your Adevos-X password: ${link} (expires in 30 minutes)`,
    };
  }
  return { html: `<p>Welcome to Adevos-X!</p>`, text: 'Welcome to Adevos-X!' };
}

/**
 * Sends real email via Resend's API when EMAIL_PROVIDER_API_KEY is
 * configured. Falls back to a dev-only log (no real delivery) when it
 * isn't, so local/dev auth flows remain testable without a provider.
 */
@Injectable()
export class MailerService implements MailerAdapter {
  private readonly logger = new Logger(MailerService.name);
  private readonly apiKey?: string;
  private readonly fromAddress?: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('EMAIL_PROVIDER_API_KEY');
    this.fromAddress = this.config.get<string>('EMAIL_FROM_ADDRESS');
    this.appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
  }

  async send(email: OutgoingEmail): Promise<void> {
    if (!this.apiKey || !this.fromAddress) {
      this.logger.warn(
        `EMAIL_PROVIDER_API_KEY/EMAIL_FROM_ADDRESS not configured — skipping real delivery. Would send "${email.templateKey}" to ${email.to}.`,
      );
      return;
    }

    const { html, text } = renderHtml(email, this.appUrl);

    try {
      const res = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: [email.to],
          subject: email.subject,
          html,
          text,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(`Resend API returned ${res.status} for "${email.templateKey}" to ${email.to}: ${body}`);
        return; // never throw — a failed email must not break registration/login/reset flows
      }

      this.logger.log(`Sent "${email.templateKey}" email to ${email.to} via Resend.`);
    } catch (err) {
      this.logger.error(`Failed to send "${email.templateKey}" email to ${email.to}: ${err instanceof Error ? err.message : err}`);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendWelcomeEmailOptions {
  to: string;
  firstName: string | null;
}

export interface SendForgotPasswordEmailOptions {
  to: string;
  firstName: string | null;
  resetLink: string;
}

// ─── Shared HTML template helpers ─────────────────────────────────────────────

const LOGO_URL =
  'https://noxwork-gedcom.vercel.app/radixflow_blue.png';

/**
 * Generates the outer shell (head + header) shared by all email templates.
 * Uses Radix brand colours:
 *   Primary  – #F97316  (Radix Orange)
 *   Accent   – #1E3A5F  (Radix Deep Blue)
 *   Surface  – #F8FAFC
 */
function emailShell(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #F0F4F8;
      font-family: 'Inter', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 600px;
      margin: 40px auto;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(30,58,95,0.10);
    }
    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #1E3A5F 0%, #0F2240 100%);
      padding: 32px 40px;
      text-align: center;
    }
    .header img {
      height: 40px;
      width: auto;
    }
    /* ── Body ── */
    .body {
      background: #FFFFFF;
      padding: 40px 40px 32px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #0F2240;
      margin-bottom: 12px;
      line-height: 1.3;
    }
    p {
      font-size: 15px;
      color: #4A5568;
      line-height: 1.7;
      margin-bottom: 16px;
    }
    /* ── CTA Button ── */
    .btn-wrapper {
      text-align: center;
      margin: 28px 0 24px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #F97316 0%, #EA6C0A 100%);
      color: #FFFFFF !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 36px;
      border-radius: 8px;
      letter-spacing: 0.3px;
    }
    /* ── Divider ── */
    .divider {
      border: none;
      border-top: 1px solid #E8EDF2;
      margin: 24px 0;
    }
    /* ── Tip box ── */
    .tip {
      background: #F0F4FF;
      border-left: 4px solid #F97316;
      border-radius: 4px;
      padding: 14px 18px;
      font-size: 13px;
      color: #4A5568;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    /* ── Reset link plain text fallback ── */
    .reset-link-plain {
      word-break: break-all;
      font-size: 12px;
      color: #718096;
      margin-top: -8px;
    }
    /* ── Footer ── */
    .footer {
      background: #F8FAFC;
      border-top: 1px solid #E8EDF2;
      padding: 20px 40px;
      text-align: center;
    }
    .footer p {
      font-size: 12px;
      color: #A0AEC0;
      margin: 0;
      line-height: 1.6;
    }
    .footer a {
      color: #F97316;
      text-decoration: none;
    }
    @media (max-width: 640px) {
      .wrapper { margin: 0; border-radius: 0; }
      .header, .body, .footer { padding-left: 24px; padding-right: 24px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header -->
    <div class="header">
      <img src="${LOGO_URL}" alt="Radix" />
    </div>

    <!-- Body -->
    <div class="body">
      ${bodyContent}
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>
        © ${new Date().getFullYear()} Radixflow · <a href="https://radixflow.app">radixflow.app</a><br/>
        You're receiving this because you signed up for a Radix account.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Template: Welcome ─────────────────────────────────────────────────────────

function welcomeTemplate(firstName: string | null): string {
  const greeting = firstName ? `Hi ${firstName} 👋` : 'Welcome aboard 👋';

  const body = `
    <h1>${greeting}</h1>
    <p>
      We're thrilled to have you on <strong>Radix</strong> — the smart platform
      for building and visualising family trees.
    </p>
    <p>
      Your account is all set. Start by creating your first project and
      uploading a GEDCOM file, or build your tree node-by-node right in
      the canvas.
    </p>

    <div class="btn-wrapper">
      <a href="https://radixflow.app/dashboard" class="btn">Go to my Dashboard →</a>
    </div>

    <hr class="divider" />

    <div class="tip">
      <strong>💡 Quick tip:</strong> Use the <em>Auto-layout</em> button on
      the canvas to instantly organise a large imported tree into a clean
      hierarchical view.
    </div>

    <p>
      Have questions? Reply to this email or visit our help centre at
      <a href="https://radixflow.app" style="color:#F97316;text-decoration:none;">radixflow.app</a>.
    </p>
    <p>
      Welcome to the family,<br/>
      <strong style="color:#1E3A5F;">The Radix Team</strong>
    </p>`;

  return emailShell('Welcome to Radix!', body);
}

// ─── Template: Forgot Password ────────────────────────────────────────────────

function forgotPasswordTemplate(
  firstName: string | null,
  resetLink: string,
): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';

  const body = `
    <h1>Reset your password</h1>
    <p>${greeting}</p>
    <p>
      We received a request to reset the password for your Radix account.
      Click the button below to choose a new password. This link is valid
      for <strong>1 hour</strong>.
    </p>

    <div class="btn-wrapper">
      <a href="${resetLink}" class="btn">Reset my Password →</a>
    </div>

    <p class="reset-link-plain">
      Or copy and paste this URL into your browser:<br/>
      ${resetLink}
    </p>

    <hr class="divider" />

    <div class="tip">
      <strong>🔒 Didn't request this?</strong> You can safely ignore this
      email. Your password won't change unless you click the link above.
    </div>

    <p>
      Stay safe,<br/>
      <strong style="color:#1E3A5F;">The Radix Team</strong>
    </p>`;

  return emailShell('Reset your Radix password', body);
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * MailService — wraps the Resend SDK to send transactional emails.
 *
 * Resend natively tracks **opens** and **clicks** (for links inside the email)
 * for verified domains on paid plans. The analytics dashboard at
 * app.resend.com → Emails shows per-message open/click events.
 *
 * Error handling philosophy:
 *   Every public method uses a try/catch and logs failures with the NestJS
 *   Logger, but NEVER re-throws. This ensures that if the email provider is
 *   down, the caller's primary flow (login, signup, etc.) is not interrupted.
 */
@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('[MailModule] RESEND_API_KEY env variable is not set.');
    }

    this.resend = new Resend(apiKey);
    this.from =
      process.env.MAIL_FROM_ADDRESS ?? 'Radix <hola@radixflow.app>';
  }

  // ── Welcome Email ───────────────────────────────────────────────────────────

  /**
   * Sends a branded welcome email after a new user registers.
   *
   * @param options.to         Recipient email address
   * @param options.firstName  User's first name (nullable — handles gracefully)
   */
  async sendWelcomeEmail(options: SendWelcomeEmailOptions): Promise<void> {
    const { to, firstName } = options;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject: '¡Bienvenido a Radix! 🎉',
        html: welcomeTemplate(firstName),
      });

      if (error) {
        this.logger.error(
          `[MailService] sendWelcomeEmail failed for ${to}: ${error.message}`,
        );
        return;
      }

      this.logger.log(
        `[MailService] Welcome email sent to ${to} (id: ${data?.id})`,
      );
    } catch (err) {
      this.logger.error(
        `[MailService] sendWelcomeEmail unexpected error for ${to}`,
        (err as Error).stack,
      );
    }
  }

  // ── Forgot Password Email ───────────────────────────────────────────────────

  /**
   * Sends a password-reset email containing a secure one-time link.
   *
   * @param options.to         Recipient email address
   * @param options.firstName  User's first name
   * @param options.resetLink  The full Supabase password-reset URL
   */
  async sendForgotPasswordEmail(
    options: SendForgotPasswordEmailOptions,
  ): Promise<void> {
    const { to, firstName, resetLink } = options;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'Restablecer tu contraseña de Radix',
        html: forgotPasswordTemplate(firstName, resetLink),
      });

      if (error) {
        this.logger.error(
          `[MailService] sendForgotPasswordEmail failed for ${to}: ${error.message}`,
        );
        return;
      }

      this.logger.log(
        `[MailService] Password-reset email sent to ${to} (id: ${data?.id})`,
      );
    } catch (err) {
      this.logger.error(
        `[MailService] sendForgotPasswordEmail unexpected error for ${to}`,
        (err as Error).stack,
      );
    }
  }
}

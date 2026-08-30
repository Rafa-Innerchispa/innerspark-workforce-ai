import nodemailer from 'nodemailer';
import { db } from '@/lib/firebase';

export type OutboundMail = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function smtpConfigured(): boolean {
  return Boolean(
    process.env.INNEROS_SMTP_HOST &&
      process.env.INNEROS_SMTP_USER &&
      process.env.INNEROS_SMTP_PASS
  );
}

function smtpFromAddress(): string {
  return (
    process.env.INNEROS_SMTP_FROM ||
    `InnerOS <${process.env.INNEROS_SMTP_USER || 'info@pcdoctor.ai'}>`
  );
}

async function sendViaSmtp(mail: OutboundMail): Promise<{ ok: boolean; error?: string }> {
  if (!smtpConfigured()) {
    return { ok: false, error: 'smtp_not_configured' };
  }

  const port = Number(process.env.INNEROS_SMTP_PORT || 587);
  const secure = process.env.INNEROS_SMTP_SECURE === 'true' || port === 465;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.INNEROS_SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.INNEROS_SMTP_USER,
        pass: process.env.INNEROS_SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: smtpFromAddress(),
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text || mail.html.replace(/<[^>]+>/g, ' '),
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('SMTP send failed', message);
    return { ok: false, error: message };
  }
}

/** Queue for Firebase Trigger Email (`mail` collection) and send immediately when SMTP is configured. */
export async function deliverMail(mail: OutboundMail): Promise<{
  queued: boolean;
  smtp: { ok: boolean; error?: string };
}> {
  let queued = false;
  try {
    await db.collection('mail').add({
      to: mail.to,
      message: {
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      },
      delivery: {
        state: 'PENDING',
        startTime: new Date().toISOString(),
        attempts: 0,
      },
    });
    queued = true;
  } catch (err) {
    console.warn('Could not queue Firestore mail document', err);
  }

  const smtp = await sendViaSmtp(mail);
  return { queued, smtp };
}

export function mailDeliveryStatus() {
  return {
    firestore_mail_collection: 'mail',
    trigger_email_extension_required: true,
    smtp_direct_fallback: smtpConfigured(),
    smtp_host: process.env.INNEROS_SMTP_HOST || null,
    smtp_from: smtpFromAddress(),
  };
}

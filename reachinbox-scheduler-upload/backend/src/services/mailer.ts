import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

let transporterPromise: Promise<Transporter> | null = null;

async function buildTransporter(): Promise<Transporter> {
  if (env.smtp.user && env.smtp.pass) {
    return nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: false,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }

  // No pinned credentials — generate a throwaway Ethereal test account.
  const testAccount = await nodemailer.createTestAccount();
  // eslint-disable-next-line no-console
  console.log(
    `[mailer] No SMTP_USER/SMTP_PASS set — generated a temporary Ethereal account:\n` +
      `  user: ${testAccount.user}\n  pass: ${testAccount.pass}\n` +
      `  Pin these in .env to keep the same inbox across restarts.`
  );
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

function getTransporter(): Promise<Transporter> {
  if (!transporterPromise) {
    transporterPromise = buildTransporter();
  }
  return transporterPromise;
}

export interface SendResult {
  messageId: string;
  previewUrl: string | null;
}

export async function sendEmail(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: params.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) || null;
  return { messageId: info.messageId, previewUrl };
}

import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env.js";

/** SMTP dianggap terkonfigurasi bila host, user, pass, dan MAIL_FROM terisi. */
export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.MAIL_FROM);
}

let transporter: Transporter | null = null;
function getTransport(): Transporter {
  if (!transporter) {
    const port = env.SMTP_PORT ?? 587;
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = TLS implisit; 587 = STARTTLS
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

export interface MailInput {
  to: string;
  subject: string;
  text: string;
}

/** Kirim email. Melempar bila SMTP belum dikonfigurasi atau gagal kirim. */
export async function sendMail(input: MailInput): Promise<{ messageId: string }> {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP belum dikonfigurasi.");
  }
  const info = await getTransport().sendMail({
    from: env.MAIL_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
  return { messageId: String(info.messageId ?? "") };
}

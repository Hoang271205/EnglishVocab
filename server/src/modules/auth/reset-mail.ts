import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { resetMailTemplate } from './reset-mail-template.js';

export function mailConfigured() {
  return Boolean(env.SMTP_USER && env.SMTP_PASSWORD);
}

let transport: ReturnType<typeof nodemailer.createTransport> | undefined;

export async function sendResetMail(email: string, token: string) {
  transport ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTLS: !env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass:
        env.SMTP_HOST === 'smtp.gmail.com'
          ? env.SMTP_PASSWORD.replace(/\s/g, '')
          : env.SMTP_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  const url = new URL(env.APP_ORIGIN);
  url.hash = `/reset-password?token=${encodeURIComponent(token)}`;
  await transport.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to: email,
    subject: 'Đặt lại mật khẩu EnglishVocab',
    text: `Bạn đã yêu cầu đặt lại mật khẩu EnglishVocab. Mở liên kết sau trong 15 phút: ${url.href}\nLiên kết chỉ dùng được một lần. Nếu không yêu cầu, hãy bỏ qua email này.`,
    html: resetMailTemplate(url),
  });
}

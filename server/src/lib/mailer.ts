import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { SystemSetting } from '../models/SystemSetting';

async function getResendClient(): Promise<{ client: Resend; from: string } | null> {
  try {
    const rows = await SystemSetting.findAll({ where: { key: ['resend_api_key', 'resend_from'] } });
    const db: Record<string, string> = {};
    for (const row of rows) { if (row.value) db[row.key] = row.value; }
    const apiKey = db['resend_api_key'] ?? '';
    if (!apiKey) return null;
    const from = db['resend_from']?.trim() || 'onboarding@resend.dev';
    return { client: new Resend(apiKey), from };
  } catch { return null; }
}

async function getSmtpTransporter(): Promise<{ transporter: nodemailer.Transporter; from: string } | null> {
  try {
    const rows = await SystemSetting.findAll({
      where: { key: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'smtp_secure'] },
    });
    const db: Record<string, string> = {};
    for (const row of rows) { if (row.value) db[row.key] = row.value; }

    const host = db['smtp_host'] ?? process.env.SMTP_HOST ?? '';
    const user = db['smtp_user'] ?? process.env.SMTP_USER ?? '';
    const pass = db['smtp_pass'] ?? process.env.SMTP_PASS ?? '';
    if (!host || !user || !pass) return null;

    return {
      transporter: nodemailer.createTransport({
        host,
        port: parseInt(db['smtp_port'] ?? process.env.SMTP_PORT ?? '587', 10),
        secure: (db['smtp_secure'] ?? process.env.SMTP_SECURE ?? 'false') === 'true',
        auth: { user, pass },
      }),
      from: db['smtp_from'] ?? process.env.SMTP_FROM ?? user,
    };
  } catch { return null; }
}

export const sendOTPEmail = async (
  to: string,
  otp: string,
  patientFirstName: string
): Promise<void> => {
  const subject = 'Your access code — OR Patient Tracking';
  const text = [
    `Your one-time access code is: ${otp}`,
    '',
    `This code lets you check on ${patientFirstName}'s progress and expires in 15 minutes.`,
    '',
    'If you did not request this code, you can ignore this message.',
  ].join('\n');
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1e293b">
      <div style="background:#0f172a;padding:20px 24px;border-radius:8px 8px 0 0">
        <span style="color:#fff;font-weight:700;font-size:16px">OR Tracking — Access Code</span>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
        <p style="margin:0 0 16px">Your one-time access code is:</p>
        <p style="font-size:2rem;font-weight:bold;letter-spacing:0.3rem;margin:0 0 16px;color:#0f172a">${otp}</p>
        <p style="margin:0 0 16px">This code lets you check on <strong>${patientFirstName}</strong>'s progress and expires in 15 minutes.</p>
        <p style="margin:0;color:#94a3b8;font-size:0.85rem">If you did not request this code, you can ignore this message.</p>
      </div>
    </div>
  `;

  // Try Resend first
  const resend = await getResendClient();
  if (resend) {
    const { error } = await resend.client.emails.send({ from: resend.from, to, subject, text, html });
    if (error) throw new Error((error as any).message ?? JSON.stringify(error));
    return;
  }

  // Fall back to SMTP
  const smtp = await getSmtpTransporter();
  if (smtp) {
    await smtp.transporter.sendMail({ from: smtp.from, to, subject, text, html });
    return;
  }

  // Neither configured — log for dev
  console.log(`[DEV] OTP email to ${to}: ${otp}`);
};

export const sendCredentialsEmail = async (
  to: string,
  name: string,
  username: string,
  password: string,
  loginUrl: string,
): Promise<void> => {
  const subject = 'Your OR Tracker login details';
  const urlLine = loginUrl ? `\nLogin at: ${loginUrl}` : '';
  const text = [
    `Hi ${name},`,
    '',
    'An administrator has set up your account on OR Tracker. Your login details are below.',
    '',
    `Username: ${username}`,
    `Password: ${password}`,
    urlLine,
    '',
    'Please change your password after your first login.',
  ].join('\n');

  const urlBlock = loginUrl
    ? `<p style="margin:0 0 16px"><a href="${loginUrl}" style="color:#2563eb">${loginUrl}</a></p>`
    : '';

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1e293b">
      <div style="background:#0f172a;padding:20px 24px;border-radius:8px 8px 0 0">
        <span style="color:#fff;font-weight:700;font-size:16px">OR Tracker — Login Details</span>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
        <p style="margin:0 0 16px">Hi <strong>${name}</strong>,</p>
        <p style="margin:0 0 16px">An administrator has set up your account. Use the details below to log in.</p>
        <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
          <tr>
            <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;width:110px">Username</td>
            <td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace">${username}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600">Password</td>
            <td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace">${password}</td>
          </tr>
        </table>
        ${urlBlock}
        <p style="margin:0;color:#94a3b8;font-size:0.85rem">Please change your password after your first login.</p>
      </div>
    </div>
  `;

  const resend = await getResendClient();
  if (resend) {
    const { error } = await resend.client.emails.send({ from: resend.from, to, subject, text, html });
    if (error) throw new Error((error as any).message ?? JSON.stringify(error));
    return;
  }

  const smtp = await getSmtpTransporter();
  if (smtp) {
    await smtp.transporter.sendMail({ from: smtp.from, to, subject, text, html });
    return;
  }

  console.log(`[DEV] Credentials email to ${to}: username=${username} password=${password}`);
};

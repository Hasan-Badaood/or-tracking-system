import nodemailer from 'nodemailer';
import twilio from 'twilio';

interface NotificationPayload {
  patientName: string;
  stageName: string;
  visitTrackingId: string;
  timestamp: Date;
}

interface FamilyContact {
  name: string;
  email?: string | null;
  phone?: string | null;
}

// ── Email ─────────────────────────────────────────────────────────────────────

const emailConfigured =
  !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = emailConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

async function sendEmail(to: string, payload: NotificationPayload): Promise<void> {
  if (!transporter) return;

  const time = payload.timestamp.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject: `Patient update — ${payload.patientName}`,
    text: [
      `Hello,`,
      ``,
      `This is an update regarding your family member currently in our care.`,
      ``,
      `Patient: ${payload.patientName}`,
      `Current stage: ${payload.stageName}`,
      `Time: ${time}`,
      `Visit reference: ${payload.visitTrackingId}`,
      ``,
      `You can track their progress using the family portal with your visit reference.`,
      ``,
      `This is an automated message — please do not reply.`,
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
        <div style="background:#0f172a;padding:20px 24px;border-radius:8px 8px 0 0">
          <span style="color:#fff;font-weight:700;font-size:16px">OR Tracking — Patient Update</span>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p style="margin:0 0 16px">Hello,</p>
          <p style="margin:0 0 16px">This is an update regarding your family member currently in our care.</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:8px 12px;background:#f8fafc;font-size:13px;color:#64748b;width:140px">Patient</td>
                <td style="padding:8px 12px;font-weight:600">${payload.patientName}</td></tr>
            <tr><td style="padding:8px 12px;background:#f8fafc;font-size:13px;color:#64748b">Current stage</td>
                <td style="padding:8px 12px;font-weight:600">${payload.stageName}</td></tr>
            <tr><td style="padding:8px 12px;background:#f8fafc;font-size:13px;color:#64748b">Time</td>
                <td style="padding:8px 12px">${time}</td></tr>
            <tr><td style="padding:8px 12px;background:#f8fafc;font-size:13px;color:#64748b">Visit reference</td>
                <td style="padding:8px 12px;font-family:monospace">${payload.visitTrackingId}</td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#94a3b8">This is an automated message — please do not reply.</p>
        </div>
      </div>
    `,
  });
}

// ── SMS ───────────────────────────────────────────────────────────────────────

const smsConfigured =
  !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);

const twilioClient = smsConfigured
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

async function sendSms(to: string, payload: NotificationPayload): Promise<void> {
  if (!twilioClient) return;

  const time = payload.timestamp.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  await twilioClient.messages.create({
    from: process.env.TWILIO_FROM_NUMBER!,
    to,
    body: `OR Update: ${payload.patientName} is now in ${payload.stageName} as of ${time}. Ref: ${payload.visitTrackingId}`,
  });
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Notify all family contacts for a visit. Fire-and-forget — errors are logged
 * but never thrown, so they cannot break the calling request.
 */
export async function notifyFamilyContacts(
  contacts: FamilyContact[],
  payload: NotificationPayload
): Promise<{ email: number; sms: number; errors: string[] }> {
  const errors: string[] = [];
  let emailsSent = 0;
  let smsSent = 0;

  for (const contact of contacts) {
    if (contact.email) {
      try {
        await sendEmail(contact.email, payload);
        emailsSent++;
      } catch (err: any) {
        console.error(`Email to ${contact.email} failed:`, err.message);
        errors.push(`Email to ${contact.email}: ${err.message}`);
      }
    }

    if (contact.phone) {
      try {
        await sendSms(contact.phone, payload);
        smsSent++;
      } catch (err: any) {
        console.error(`SMS to ${contact.phone} failed:`, err.message);
        errors.push(`SMS to ${contact.phone}: ${err.message}`);
      }
    }
  }

  return { email: emailsSent, sms: smsSent, errors };
}

export const notificationConfig = {
  emailConfigured,
  smsConfigured,
};

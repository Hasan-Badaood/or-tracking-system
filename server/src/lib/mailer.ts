import nodemailer from 'nodemailer';

// Transporter is only created when EMAIL_HOST is configured.
// Without it the mailer falls back to logging, so the server starts
// without email credentials in development.
const createTransporter = () => {
  if (!process.env.EMAIL_HOST) return null;

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASS!,
    },
  });
};

const transporter = createTransporter();

export const sendOTPEmail = async (
  to: string,
  otp: string,
  patientFirstName: string
): Promise<void> => {
  if (!transporter) {
    console.log(`[DEV] OTP email to ${to}: ${otp}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@or-tracking.nhs.uk',
    to,
    subject: 'Your access code — OR Patient Tracking',
    text: [
      `Your one-time access code is: ${otp}`,
      '',
      `This code lets you check on ${patientFirstName}'s progress and expires in 15 minutes.`,
      '',
      'If you did not request this code, you can ignore this message.',
    ].join('\n'),
    html: `
      <p>Your one-time access code is:</p>
      <p style="font-size:2rem;font-weight:bold;letter-spacing:0.2rem">${otp}</p>
      <p>This code lets you check on <strong>${patientFirstName}</strong>'s progress and expires in 15 minutes.</p>
      <p style="color:#888;font-size:0.85rem">If you did not request this code, you can ignore this message.</p>
    `,
  });
};

import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import twilio from 'twilio';
import { authenticate } from '../middleware/auth';
import { SystemSetting } from '../models/SystemSetting';

const router = Router();

const SMTP_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'smtp_secure'] as const;
const PASS_PLACEHOLDER = '••••••••';

function requireAdmin(req: Request, res: Response): boolean {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return false;
  }
  return true;
}

// GET /api/settings/smtp — returns current SMTP config (password masked)
router.get('/smtp', authenticate, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const rows = await SystemSetting.findAll({ where: { key: [...SMTP_KEYS] } });
  const db: Record<string, string> = {};
  for (const row of rows) {
    if (row.value !== null) db[row.key] = row.value;
  }

  res.json({
    success: true,
    config: {
      smtp_host:   db['smtp_host']   ?? '',
      smtp_port:   db['smtp_port']   ?? '587',
      smtp_user:   db['smtp_user']   ?? '',
      smtp_pass:   db['smtp_pass']   ? PASS_PLACEHOLDER : '',
      smtp_from:   db['smtp_from']   ?? '',
      smtp_secure: db['smtp_secure'] ?? 'false',
    },
  });
});

// PUT /api/settings/smtp — save SMTP config to DB
router.put('/smtp', authenticate, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure } = req.body;

  const updates: { key: string; value: string }[] = [];

  if (smtp_host   !== undefined) updates.push({ key: 'smtp_host',   value: String(smtp_host).trim() });
  if (smtp_port   !== undefined) updates.push({ key: 'smtp_port',   value: String(smtp_port).trim() });
  if (smtp_user   !== undefined) updates.push({ key: 'smtp_user',   value: String(smtp_user).trim() });
  if (smtp_from   !== undefined) updates.push({ key: 'smtp_from',   value: String(smtp_from).trim() });
  if (smtp_secure !== undefined) updates.push({ key: 'smtp_secure', value: smtp_secure === true || smtp_secure === 'true' ? 'true' : 'false' });
  // Only update password if a real value was sent (not the placeholder)
  if (smtp_pass !== undefined && smtp_pass !== PASS_PLACEHOLDER && smtp_pass !== '') {
    updates.push({ key: 'smtp_pass', value: String(smtp_pass) });
  }

  for (const { key, value } of updates) {
    await SystemSetting.upsert({ key, value });
  }

  res.json({ success: true });
});

// POST /api/settings/smtp/test — verify the current SMTP config works
router.post('/smtp/test', authenticate, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const rows = await SystemSetting.findAll({ where: { key: [...SMTP_KEYS] } });
  const db: Record<string, string> = {};
  for (const row of rows) {
    if (row.value !== null && row.value !== '') db[row.key] = row.value;
  }

  const host = db['smtp_host'] ?? process.env.SMTP_HOST ?? '';
  const user = db['smtp_user'] ?? process.env.SMTP_USER ?? '';
  const pass = db['smtp_pass'] ?? process.env.SMTP_PASS ?? '';

  if (!host || !user || !pass) {
    return res.status(400).json({ success: false, error: 'SMTP config is incomplete' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(db['smtp_port'] ?? process.env.SMTP_PORT ?? '587', 10),
      secure: (db['smtp_secure'] ?? process.env.SMTP_SECURE ?? 'false') === 'true',
      auth: { user, pass },
      connectionTimeout: 10_000,
      socketTimeout: 10_000,
      greetingTimeout: 10_000,
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection timed out after 10 seconds')), 10_000)
    );

    await Promise.race([transporter.verify(), timeout]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/settings/resend
router.get('/resend', authenticate, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const rows = await SystemSetting.findAll({ where: { key: ['resend_api_key', 'resend_from'] } });
  const db: Record<string, string> = {};
  for (const row of rows) {
    if (row.value !== null) db[row.key] = row.value;
  }

  res.json({
    success: true,
    config: {
      resend_api_key: db['resend_api_key'] ? '••••••••' : '',
      resend_from:    db['resend_from']    ?? '',
    },
  });
});

// PUT /api/settings/resend
router.put('/resend', authenticate, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const { resend_api_key, resend_from } = req.body;

  if (resend_api_key !== undefined && resend_api_key !== '••••••••' && resend_api_key !== '') {
    await SystemSetting.upsert({ key: 'resend_api_key', value: String(resend_api_key).trim() });
  }
  if (resend_from !== undefined) {
    await SystemSetting.upsert({ key: 'resend_from', value: String(resend_from).trim() });
  }

  res.json({ success: true });
});

// POST /api/settings/resend/test — validate API key (no email sent)
router.post('/resend/test', authenticate, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const rows = await SystemSetting.findAll({ where: { key: ['resend_api_key', 'resend_from'] } });
  const db: Record<string, string> = {};
  for (const row of rows) {
    if (row.value) db[row.key] = row.value;
  }

  const apiKey = db['resend_api_key'] ?? '';
  if (!apiKey) {
    return res.status(400).json({ success: false, error: 'Resend API key is not set' });
  }

  try {
    const client = new Resend(apiKey);
    const { error } = await client.apiKeys.list();
    if (error) throw new Error(error.message);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/settings/resend/send-test — actually send a test email to a given address
router.post('/resend/send-test', authenticate, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const { to } = req.body;
  if (!to) {
    return res.status(400).json({ success: false, error: 'to address is required' });
  }

  const rows = await SystemSetting.findAll({ where: { key: ['resend_api_key', 'resend_from'] } });
  const db: Record<string, string> = {};
  for (const row of rows) {
    if (row.value) db[row.key] = row.value;
  }

  const apiKey = db['resend_api_key'] ?? '';
  const from   = db['resend_from']   ?? '';

  if (!apiKey) return res.status(400).json({ success: false, error: 'Resend API key is not set' });
  if (!from)   return res.status(400).json({ success: false, error: 'From address is not set' });

  try {
    const client = new Resend(apiKey);
    const { error } = await client.emails.send({
      from,
      to,
      subject: 'OR Tracker — email test',
      text: 'This is a test email from your OR Patient Tracking System. Email notifications are working correctly.',
      html: '<div style="font-family:sans-serif;padding:24px"><p>This is a test email from your <strong>OR Patient Tracking System</strong>.</p><p>Email notifications are working correctly.</p></div>',
    });
    if (error) throw new Error((error as any).message ?? JSON.stringify(error));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/settings/twilio
router.get('/twilio', authenticate, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const rows = await SystemSetting.findAll({ where: { key: ['twilio_account_sid', 'twilio_auth_token', 'twilio_from'] } });
  const db: Record<string, string> = {};
  for (const row of rows) { if (row.value !== null) db[row.key] = row.value; }

  res.json({
    success: true,
    config: {
      twilio_account_sid: db['twilio_account_sid'] ?? '',
      twilio_auth_token:  db['twilio_auth_token']  ? PASS_PLACEHOLDER : '',
      twilio_from:        db['twilio_from']        ?? '',
    },
  });
});

// PUT /api/settings/twilio
router.put('/twilio', authenticate, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const { twilio_account_sid, twilio_auth_token, twilio_from } = req.body;

  if (twilio_account_sid !== undefined)
    await SystemSetting.upsert({ key: 'twilio_account_sid', value: String(twilio_account_sid).trim() });
  if (twilio_from !== undefined)
    await SystemSetting.upsert({ key: 'twilio_from', value: String(twilio_from).trim() });
  if (twilio_auth_token !== undefined && twilio_auth_token !== PASS_PLACEHOLDER && twilio_auth_token !== '')
    await SystemSetting.upsert({ key: 'twilio_auth_token', value: String(twilio_auth_token).trim() });

  res.json({ success: true });
});

// POST /api/settings/twilio/test — validate credentials by listing Twilio account
router.post('/twilio/test', authenticate, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const rows = await SystemSetting.findAll({ where: { key: ['twilio_account_sid', 'twilio_auth_token', 'twilio_from'] } });
  const db: Record<string, string> = {};
  for (const row of rows) { if (row.value) db[row.key] = row.value; }

  const sid   = db['twilio_account_sid'] ?? process.env.TWILIO_ACCOUNT_SID ?? '';
  const token = db['twilio_auth_token']  ?? process.env.TWILIO_AUTH_TOKEN  ?? '';
  const from  = db['twilio_from']        ?? process.env.TWILIO_FROM        ?? '';

  if (!sid || !token || !from) {
    return res.status(400).json({ success: false, error: 'Twilio config is incomplete (SID, auth token, and from number required)' });
  }

  try {
    const client = twilio(sid, token);
    await client.api.accounts(sid).fetch();
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/settings/twilio/send-test — send a test SMS to a given number
router.post('/twilio/send-test', authenticate, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const { to } = req.body;
  if (!to) return res.status(400).json({ success: false, error: 'to phone number is required' });

  const rows = await SystemSetting.findAll({ where: { key: ['twilio_account_sid', 'twilio_auth_token', 'twilio_from'] } });
  const db: Record<string, string> = {};
  for (const row of rows) { if (row.value) db[row.key] = row.value; }

  const sid   = db['twilio_account_sid'] ?? process.env.TWILIO_ACCOUNT_SID ?? '';
  const token = db['twilio_auth_token']  ?? process.env.TWILIO_AUTH_TOKEN  ?? '';
  const from  = db['twilio_from']        ?? process.env.TWILIO_FROM        ?? '';

  if (!sid || !token || !from) {
    return res.status(400).json({ success: false, error: 'Twilio config is incomplete' });
  }

  try {
    const client = twilio(sid, token);
    await client.messages.create({
      from,
      to,
      body: 'This is a test message from your OR Patient Tracking System. SMS notifications are working correctly.',
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

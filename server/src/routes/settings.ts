import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';
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
    });

    await transporter.verify();
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

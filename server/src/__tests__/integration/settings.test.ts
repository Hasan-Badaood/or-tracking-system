jest.mock('../../config/database', () => ({
  sequelize: { transaction: jest.fn() },
}));
jest.mock('../../models', () => ({
  Visit: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn(), findAndCountAll: jest.fn() },
  Stage: { findByPk: jest.fn(), findOne: jest.fn() },
  Patient: { findOne: jest.fn(), create: jest.fn(), upsert: jest.fn() },
  StageEvent: { create: jest.fn() },
  ORRoom: { findByPk: jest.fn() },
  FamilyContact: { create: jest.fn() },
  User: { findByPk: jest.fn() },
}));
jest.mock('../../models/CleaningTimer', () => ({
  CleaningTimer: { create: jest.fn() },
}));
jest.mock('../../models/SystemSetting', () => ({
  SystemSetting: { findAll: jest.fn().mockResolvedValue([]), upsert: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../../services/notificationService', () => ({
  notifyFamilyContacts: jest.fn(),
}));
jest.mock('../../lib/tokenBlocklist', () => ({
  isBlacklisted: jest.fn().mockResolvedValue(false),
  addToBlocklist: jest.fn(),
}));
jest.mock('../../models/BlacklistedToken', () => ({
  BlacklistedToken: { findOne: jest.fn().mockResolvedValue(null), upsert: jest.fn(), destroy: jest.fn() },
}));
jest.mock('../../models/User', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
}));
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockResolvedValue(true),
  }),
}));
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    apiKeys: { list: jest.fn().mockResolvedValue({ data: [], error: null }) },
    emails: { send: jest.fn().mockResolvedValue({ data: { id: 'msg1' }, error: null }) },
  })),
}));
jest.mock('twilio', () =>
  jest.fn().mockReturnValue({
    api: {
      accounts: jest.fn().mockReturnValue({
        fetch: jest.fn().mockResolvedValue({ sid: 'ACtest' }),
      }),
    },
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'SMtest' }),
    },
  })
);

import request from 'supertest';
import app from '../../app';
import { SystemSetting } from '../../models/SystemSetting';
import jwt from 'jsonwebtoken';

const makeToken = (role = 'admin') =>
  jwt.sign({ id: 1, username: 'admin', role }, 'test-secret', { expiresIn: '1h' });

const makeSettingRow = (key: string, value: string) => ({ key, value });

describe('GET /api/settings/smtp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/settings/smtp');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .get('/api/settings/smtp')
      .set('Authorization', `Bearer ${makeToken('nurse')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with empty config when no settings stored', async () => {
    (SystemSetting.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/settings/smtp')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.config.smtp_host).toBe('');
    expect(res.body.config.smtp_port).toBe('587');
  });

  it('masks smtp_pass in the response', async () => {
    (SystemSetting.findAll as jest.Mock).mockResolvedValue([
      makeSettingRow('smtp_host', 'smtp.example.com'),
      makeSettingRow('smtp_pass', 'secret123'),
    ]);

    const res = await request(app)
      .get('/api/settings/smtp')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.config.smtp_pass).toBe('••••••••');
    expect(res.body.config.smtp_host).toBe('smtp.example.com');
  });
});

describe('PUT /api/settings/smtp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .put('/api/settings/smtp')
      .set('Authorization', `Bearer ${makeToken('nurse')}`)
      .send({ smtp_host: 'smtp.example.com' });
    expect(res.status).toBe(403);
  });

  it('returns 200 and saves settings', async () => {
    const res = await request(app)
      .put('/api/settings/smtp')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('does not update password when placeholder is sent', async () => {
    const res = await request(app)
      .put('/api/settings/smtp')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ smtp_pass: '••••••••' });

    expect(res.status).toBe(200);
    const upsertCalls = (SystemSetting.upsert as jest.Mock).mock.calls;
    const passCall = upsertCalls.find((c: any[]) => c[0]?.key === 'smtp_pass');
    expect(passCall).toBeUndefined();
  });

  it('updates password when a real value is sent', async () => {
    const res = await request(app)
      .put('/api/settings/smtp')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ smtp_pass: 'newrealpassword' });

    expect(res.status).toBe(200);
    const upsertCalls = (SystemSetting.upsert as jest.Mock).mock.calls;
    const passCall = upsertCalls.find((c: any[]) => c[0]?.key === 'smtp_pass');
    expect(passCall).toBeDefined();
  });
});

describe('POST /api/settings/smtp/test', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when smtp config is incomplete', async () => {
    (SystemSetting.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .post('/api/settings/smtp/test')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 when smtp verify succeeds', async () => {
    (SystemSetting.findAll as jest.Mock).mockResolvedValue([
      makeSettingRow('smtp_host', 'smtp.example.com'),
      makeSettingRow('smtp_user', 'user@example.com'),
      makeSettingRow('smtp_pass', 'secret'),
    ]);

    const res = await request(app)
      .post('/api/settings/smtp/test')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/settings/resend', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .get('/api/settings/resend')
      .set('Authorization', `Bearer ${makeToken('nurse')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with masked api key', async () => {
    (SystemSetting.findAll as jest.Mock).mockResolvedValue([
      makeSettingRow('resend_api_key', 're_abc123'),
      makeSettingRow('resend_from', 'noreply@example.com'),
    ]);

    const res = await request(app)
      .get('/api/settings/resend')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.config.resend_api_key).toBe('••••••••');
    expect(res.body.config.resend_from).toBe('noreply@example.com');
  });
});

describe('POST /api/settings/resend/test', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when api key not set', async () => {
    (SystemSetting.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .post('/api/settings/resend/test')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(400);
  });

  it('returns 200 when api key is valid', async () => {
    (SystemSetting.findAll as jest.Mock).mockResolvedValue([
      makeSettingRow('resend_api_key', 're_valid_key'),
    ]);

    const res = await request(app)
      .post('/api/settings/resend/test')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/settings/resend/send-test', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when to address is missing', async () => {
    const res = await request(app)
      .post('/api/settings/resend/send-test')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/to address/i);
  });

  it('returns 400 when api key not configured', async () => {
    (SystemSetting.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .post('/api/settings/resend/send-test')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ to: 'test@example.com' });

    expect(res.status).toBe(400);
  });

  it('returns 200 when email sent successfully', async () => {
    (SystemSetting.findAll as jest.Mock).mockResolvedValue([
      makeSettingRow('resend_api_key', 're_valid_key'),
      makeSettingRow('resend_from', 'noreply@example.com'),
    ]);

    const res = await request(app)
      .post('/api/settings/resend/send-test')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ to: 'test@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/settings/twilio', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .get('/api/settings/twilio')
      .set('Authorization', `Bearer ${makeToken('nurse')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with masked auth token', async () => {
    (SystemSetting.findAll as jest.Mock).mockResolvedValue([
      makeSettingRow('twilio_account_sid', 'ACtest'),
      makeSettingRow('twilio_auth_token', 'secret_token'),
      makeSettingRow('twilio_from', '+15551234567'),
    ]);

    const res = await request(app)
      .get('/api/settings/twilio')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.config.twilio_account_sid).toBe('ACtest');
    expect(res.body.config.twilio_auth_token).toBe('••••••••');
    expect(res.body.config.twilio_from).toBe('+15551234567');
  });
});

describe('PUT /api/settings/twilio', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 and saves settings', async () => {
    const res = await request(app)
      .put('/api/settings/twilio')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ twilio_account_sid: 'ACnew', twilio_from: '+15559999999' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/settings/twilio/test', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when config is incomplete', async () => {
    (SystemSetting.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .post('/api/settings/twilio/test')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 when credentials are valid', async () => {
    (SystemSetting.findAll as jest.Mock).mockResolvedValue([
      makeSettingRow('twilio_account_sid', 'ACtest'),
      makeSettingRow('twilio_auth_token', 'authtoken'),
      makeSettingRow('twilio_from', '+15551234567'),
    ]);

    const res = await request(app)
      .post('/api/settings/twilio/test')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/settings/twilio/send-test', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when to is missing', async () => {
    const res = await request(app)
      .post('/api/settings/twilio/send-test')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when config is incomplete', async () => {
    (SystemSetting.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .post('/api/settings/twilio/send-test')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ to: '+15550000000' });

    expect(res.status).toBe(400);
  });

  it('returns 200 when SMS sent successfully', async () => {
    (SystemSetting.findAll as jest.Mock).mockResolvedValue([
      makeSettingRow('twilio_account_sid', 'ACtest'),
      makeSettingRow('twilio_auth_token', 'authtoken'),
      makeSettingRow('twilio_from', '+15551234567'),
    ]);

    const res = await request(app)
      .post('/api/settings/twilio/send-test')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ to: '+15550000000' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

jest.mock('../../config/database', () => ({
  sequelize: { transaction: jest.fn() },
}));
jest.mock('../../models', () => ({
  Visit: { findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn(), findAndCountAll: jest.fn() },
  Stage: { findByPk: jest.fn(), findOne: jest.fn() },
  Patient: { findOne: jest.fn(), create: jest.fn(), upsert: jest.fn() },
  StageEvent: { create: jest.fn() },
  ORRoom: { findByPk: jest.fn() },
  FamilyContact: { findOne: jest.fn(), create: jest.fn() },
  FamilyToken: { findOne: jest.fn(), create: jest.fn(), count: jest.fn() },
  User: { findByPk: jest.fn() },
}));
jest.mock('../../models/CleaningTimer', () => ({
  CleaningTimer: { create: jest.fn() },
}));
jest.mock('../../models/SystemSetting', () => ({
  SystemSetting: { findAll: jest.fn().mockResolvedValue([]), upsert: jest.fn() },
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
jest.mock('../../lib/mailer', () => ({
  sendCredentialsEmail: jest.fn().mockResolvedValue(undefined),
  sendOTPEmail: jest.fn().mockResolvedValue(undefined),
  sendOTPSms: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../../app';
import { Visit, FamilyContact, FamilyToken } from '../../models';

const makeVisit = (stageName = 'In Theatre', active = true) => ({
  id: 1,
  visit_tracking_id: 'VT-20260422-001',
  active,
  discharge_note: null,
  updated_at: new Date(),
  get: jest.fn((key: string) => {
    if (key === 'current_stage') return { name: stageName, color: '#e74c3c' };
    if (key === 'patient') return { first_name: 'John' };
    return null;
  }),
});

const makeFamilyContact = (overrides: any = {}) => ({
  id: 10,
  visit_id: 1,
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+15551234567',
  consent_given: true,
  ...overrides,
});

const makeFamilyToken = (overrides: any = {}) => ({
  id: 20,
  family_contact_id: 10,
  visit_id: 1,
  token: 'fam_abc123',
  otp: '123456',
  otp_expires_at: new Date(Date.now() + 15 * 60 * 1000),
  otp_attempts: 0,
  token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
  is_locked: false,
  locked_until: null,
  save: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockReturnValue(null),
  ...overrides,
});

describe('POST /api/family/request-otp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when visit_tracking_id is missing', async () => {
    const res = await request(app)
      .post('/api/family/request-otp')
      .send({ email: 'jane@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when neither email nor phone is provided', async () => {
    const res = await request(app)
      .post('/api/family/request-otp')
      .send({ visit_tracking_id: 'VT-001' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when visit does not exist', async () => {
    (Visit.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/family/request-otp')
      .send({ visit_tracking_id: 'VT-MISSING', email: 'jane@example.com' });

    expect(res.status).toBe(404);
  });

  it('returns discharged status directly without OTP when patient is discharged', async () => {
    (Visit.findOne as jest.Mock).mockResolvedValue(makeVisit('Discharged', false));

    const res = await request(app)
      .post('/api/family/request-otp')
      .send({ visit_tracking_id: 'VT-20260422-001', email: 'jane@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.discharged).toBe(true);
    expect(res.body.visit.current_stage.name).toBe('Discharged');
  });

  it('returns 404 when no family contact found for visit', async () => {
    (Visit.findOne as jest.Mock).mockResolvedValue(makeVisit());
    (FamilyContact.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/family/request-otp')
      .send({ visit_tracking_id: 'VT-20260422-001', email: 'unknown@example.com' });

    expect(res.status).toBe(404);
  });

  it('returns 403 when consent not given', async () => {
    (Visit.findOne as jest.Mock).mockResolvedValue(makeVisit());
    (FamilyContact.findOne as jest.Mock).mockResolvedValue(makeFamilyContact({ consent_given: false }));

    const res = await request(app)
      .post('/api/family/request-otp')
      .send({ visit_tracking_id: 'VT-20260422-001', email: 'jane@example.com' });

    expect(res.status).toBe(403);
  });

  it('returns 429 when rate limit exceeded', async () => {
    (Visit.findOne as jest.Mock).mockResolvedValue(makeVisit());
    (FamilyContact.findOne as jest.Mock).mockResolvedValue(makeFamilyContact());
    (FamilyToken.count as jest.Mock).mockResolvedValue(3);

    const res = await request(app)
      .post('/api/family/request-otp')
      .send({ visit_tracking_id: 'VT-20260422-001', email: 'jane@example.com' });

    expect(res.status).toBe(429);
  });

  it('returns 200 and sends OTP when all conditions met', async () => {
    const { sendOTPEmail } = require('../../lib/mailer');
    (Visit.findOne as jest.Mock).mockResolvedValue(makeVisit());
    (FamilyContact.findOne as jest.Mock).mockResolvedValue(makeFamilyContact());
    (FamilyToken.count as jest.Mock).mockResolvedValue(0);
    (FamilyToken.create as jest.Mock).mockResolvedValue(makeFamilyToken());

    const res = await request(app)
      .post('/api/family/request-otp')
      .send({ visit_tracking_id: 'VT-20260422-001', email: 'jane@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.delivery_method).toBe('email');
    expect(res.body.masked_recipient).toContain('***');
    expect(sendOTPEmail).toHaveBeenCalled();
  });

  it('sends via SMS when only phone is registered', async () => {
    const { sendOTPSms } = require('../../lib/mailer');
    (Visit.findOne as jest.Mock).mockResolvedValue(makeVisit());
    (FamilyContact.findOne as jest.Mock).mockResolvedValue(
      makeFamilyContact({ email: null })
    );
    (FamilyToken.count as jest.Mock).mockResolvedValue(0);
    (FamilyToken.create as jest.Mock).mockResolvedValue(makeFamilyToken());

    const res = await request(app)
      .post('/api/family/request-otp')
      .send({ visit_tracking_id: 'VT-20260422-001', phone: '+15551234567' });

    expect(res.status).toBe(200);
    expect(res.body.delivery_method).toBe('sms');
    expect(sendOTPSms).toHaveBeenCalled();
  });
});

describe('POST /api/family/verify-otp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/family/verify-otp')
      .send({ visit_tracking_id: 'VT-001' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when visit does not exist', async () => {
    (Visit.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/family/verify-otp')
      .send({ visit_tracking_id: 'VT-MISSING', otp: '123456' });

    expect(res.status).toBe(404);
  });

  it('returns 404 when no OTP request found for visit', async () => {
    (Visit.findOne as jest.Mock).mockResolvedValue(makeVisit());
    (FamilyToken.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/family/verify-otp')
      .send({ visit_tracking_id: 'VT-20260422-001', otp: '123456' });

    expect(res.status).toBe(404);
  });

  it('returns 423 when account is locked', async () => {
    (Visit.findOne as jest.Mock).mockResolvedValue(makeVisit());
    (FamilyToken.findOne as jest.Mock).mockResolvedValue(
      makeFamilyToken({ is_locked: true, locked_until: new Date(Date.now() + 60 * 60 * 1000) })
    );

    const res = await request(app)
      .post('/api/family/verify-otp')
      .send({ visit_tracking_id: 'VT-20260422-001', otp: '999999' });

    expect(res.status).toBe(423);
  });

  it('returns 401 when OTP is expired', async () => {
    (Visit.findOne as jest.Mock).mockResolvedValue(makeVisit());
    (FamilyToken.findOne as jest.Mock).mockResolvedValue(
      makeFamilyToken({ otp_expires_at: new Date(Date.now() - 1000) })
    );

    const res = await request(app)
      .post('/api/family/verify-otp')
      .send({ visit_tracking_id: 'VT-20260422-001', otp: '123456' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired/i);
  });

  it('returns 401 when OTP is wrong', async () => {
    (Visit.findOne as jest.Mock).mockResolvedValue(makeVisit());
    (FamilyToken.findOne as jest.Mock).mockResolvedValue(makeFamilyToken());

    const res = await request(app)
      .post('/api/family/verify-otp')
      .send({ visit_tracking_id: 'VT-20260422-001', otp: '000000' });

    expect(res.status).toBe(401);
    expect(res.body.attempts_remaining).toBe(2);
  });

  it('locks account after 3 wrong attempts', async () => {
    const token = makeFamilyToken({ otp_attempts: 2 });
    (Visit.findOne as jest.Mock).mockResolvedValue(makeVisit());
    (FamilyToken.findOne as jest.Mock).mockResolvedValue(token);

    const res = await request(app)
      .post('/api/family/verify-otp')
      .send({ visit_tracking_id: 'VT-20260422-001', otp: '000000' });

    expect(res.status).toBe(423);
    expect(token.is_locked).toBe(true);
    expect(token.save).toHaveBeenCalled();
  });

  it('returns 200 with access token when OTP is correct', async () => {
    const visit = makeVisit('In Theatre');
    (Visit.findOne as jest.Mock).mockResolvedValue(visit);
    (FamilyToken.findOne as jest.Mock).mockResolvedValue(makeFamilyToken());

    const res = await request(app)
      .post('/api/family/verify-otp')
      .send({ visit_tracking_id: 'VT-20260422-001', otp: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.access_token).toBe('fam_abc123');
    expect(res.body.visit).toBeDefined();
    expect(res.body.visit.patient_first_name).toBe('John');
  });
});

describe('GET /api/family/visit/:token', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when token is invalid', async () => {
    (FamilyToken.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/family/visit/invalid_token');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid token/i);
  });

  it('returns 401 when token is expired', async () => {
    (FamilyToken.findOne as jest.Mock).mockResolvedValue(
      makeFamilyToken({ token_expires_at: new Date(Date.now() - 1000) })
    );

    const res = await request(app).get('/api/family/visit/fam_abc123');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired/i);
  });

  it('returns 200 with visit status for valid token', async () => {
    const token = makeFamilyToken();
    token.get = jest.fn((key: string) => {
      if (key === 'visit') {
        return {
          visit_tracking_id: 'VT-20260422-001',
          discharge_note: null,
          updated_at: new Date(),
          patient: { first_name: 'John' },
          current_stage: { name: 'In Theatre', color: '#e74c3c' },
        };
      }
      return null;
    });
    (FamilyToken.findOne as jest.Mock).mockResolvedValue(token);

    const res = await request(app).get('/api/family/visit/fam_abc123');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.visit_tracking_id).toBe('VT-20260422-001');
    expect(res.body.patient_first_name).toBe('John');
    expect(res.body.current_stage.name).toBe('In Theatre');
    expect(res.body.stage_progress_percent).toBeGreaterThan(0);
  });
});

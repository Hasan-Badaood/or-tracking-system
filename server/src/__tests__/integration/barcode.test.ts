jest.mock('../../config/database', () => ({
  sequelize: { transaction: jest.fn() },
}));
jest.mock('../../models', () => ({
  Visit: { findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn(), findAndCountAll: jest.fn() },
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
jest.mock('bwip-js', () => ({
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-png-data')),
}));

import request from 'supertest';
import app from '../../app';
import { Visit } from '../../models';
import jwt from 'jsonwebtoken';

const makeToken = (role = 'admin') =>
  jwt.sign({ id: 1, username: 'admin', role }, 'test-secret', { expiresIn: '1h' });

const makeVisit = (overrides: any = {}) => ({
  id: 1,
  visit_tracking_id: 'VT-20260422-001',
  active: true,
  get: jest.fn((key: string) => {
    if (key === 'patient') return { first_name: 'John', last_name: 'Doe', mrn: 'MRN001' };
    if (key === 'current_stage') return { id: 2, name: 'In Theatre' };
    if (key === 'or_room') return { id: 1, name: 'OR-1' };
    return null;
  }),
  ...overrides,
});

describe('POST /api/barcode/generate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/barcode/generate').send({ visit_tracking_id: 'VT-001' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when visit_tracking_id is missing', async () => {
    const res = await request(app)
      .post('/api/barcode/generate')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/visit_tracking_id/i);
  });

  it('returns 404 when visit does not exist', async () => {
    (Visit.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/barcode/generate')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ visit_tracking_id: 'VT-MISSING' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 with base64 barcode image', async () => {
    (Visit.findOne as jest.Mock).mockResolvedValue(makeVisit());

    const res = await request(app)
      .post('/api/barcode/generate')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ visit_tracking_id: 'VT-20260422-001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.barcode.data).toBe('VT-20260422-001');
    expect(res.body.barcode.format).toBe('CODE128');
    expect(res.body.barcode.base64).toMatch(/^data:image\/png;base64,/);
  });

  it('accepts custom width and height', async () => {
    const bwipjs = require('bwip-js');
    (Visit.findOne as jest.Mock).mockResolvedValue(makeVisit());

    await request(app)
      .post('/api/barcode/generate')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ visit_tracking_id: 'VT-20260422-001', width: 80, height: 20 });

    expect(bwipjs.toBuffer).toHaveBeenCalledWith(
      expect.objectContaining({ width: 80, height: 20 })
    );
  });
});

describe('POST /api/barcode/scan', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/barcode/scan').send({ barcode_data: 'VT-001' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when barcode_data is missing', async () => {
    const res = await request(app)
      .post('/api/barcode/scan')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/barcode_data/i);
  });

  it('returns 404 when no visit matches barcode', async () => {
    (Visit.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/barcode/scan')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ barcode_data: 'VT-NOTFOUND' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/VT-NOTFOUND/);
  });

  it('returns 200 with visit data when barcode matches', async () => {
    (Visit.findOne as jest.Mock).mockResolvedValue(makeVisit());

    const res = await request(app)
      .post('/api/barcode/scan')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ barcode_data: 'VT-20260422-001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.visit.visit_tracking_id).toBe('VT-20260422-001');
    expect(res.body.visit.patient.first_name).toBe('John');
    expect(res.body.visit.current_stage.name).toBe('In Theatre');
    expect(res.body.visit.or_room.name).toBe('OR-1');
  });

  it('returns null or_room when visit has no room assigned', async () => {
    const visit = makeVisit();
    visit.get = jest.fn((key: string) => {
      if (key === 'patient') return { first_name: 'John', last_name: 'Doe', mrn: 'MRN001' };
      if (key === 'current_stage') return { id: 2, name: 'Pre-Op Assessment' };
      if (key === 'or_room') return null;
      return null;
    });
    (Visit.findOne as jest.Mock).mockResolvedValue(visit);

    const res = await request(app)
      .post('/api/barcode/scan')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ barcode_data: 'VT-20260422-001' });

    expect(res.status).toBe(200);
    expect(res.body.visit.or_room).toBeNull();
  });
});

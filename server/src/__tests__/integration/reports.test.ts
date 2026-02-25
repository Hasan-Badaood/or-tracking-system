jest.mock('../../config/database', () => ({
  sequelize: { transaction: jest.fn() },
}));
jest.mock('../../models', () => ({
  Visit: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn(), findAndCountAll: jest.fn() },
  Stage: { findByPk: jest.fn(), findOne: jest.fn() },
  Patient: { findOne: jest.fn(), create: jest.fn(), upsert: jest.fn() },
  StageEvent: { create: jest.fn(), findAll: jest.fn(), findAndCountAll: jest.fn() },
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
  getNotificationConfig: jest.fn().mockResolvedValue({ email_enabled: false, sms_enabled: false }),
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

import request from 'supertest';
import app from '../../app';
import { Visit, StageEvent } from '../../models';
import jwt from 'jsonwebtoken';

const makeToken = (role = 'admin') =>
  jwt.sign({ id: 1, username: 'admin', role }, 'test-secret', { expiresIn: '1h' });

const makeVisit = (stageName = 'In Theatre') => ({
  id: 1,
  visit_tracking_id: 'VT-001',
  active: true,
  createdAt: new Date('2026-04-22T08:00:00Z'),
  updatedAt: new Date('2026-04-22T10:00:00Z'),
  get: jest.fn((key: string) => {
    if (key === 'current_stage') return { name: stageName, color: '#e74c3c' };
    return null;
  }),
});

describe('GET /api/reports/daily-summary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/reports/daily-summary');
    expect(res.status).toBe(401);
  });

  it('returns 200 with zero summary when no visits', async () => {
    (Visit.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/reports/daily-summary')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.total_visits).toBe(0);
    expect(res.body.summary.average_duration_minutes).toBe(0);
  });

  it('returns 200 with summary for a specific date', async () => {
    (Visit.findAll as jest.Mock).mockResolvedValue([makeVisit('In Theatre'), makeVisit('Discharged')]);

    const res = await request(app)
      .get('/api/reports/daily-summary?date=2026-04-22')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.total_visits).toBe(2);
    expect(res.body.summary.completed_visits).toBe(1);
    expect(res.body.summary.active_visits).toBe(1);
    expect(res.body.by_stage).toBeInstanceOf(Array);
  });
});

describe('GET /api/reports/date-range', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when start_date or end_date is missing', async () => {
    const res = await request(app)
      .get('/api/reports/date-range?start_date=2026-04-01')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when end_date is missing', async () => {
    const res = await request(app)
      .get('/api/reports/date-range?end_date=2026-04-22')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(400);
  });

  it('returns 200 with daily rows when both dates provided', async () => {
    (Visit.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/reports/date-range?start_date=2026-04-20&end_date=2026-04-22')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.rows).toBeInstanceOf(Array);
    expect(res.body.rows).toHaveLength(3);
    expect(res.body.rows[0]).toHaveProperty('date');
    expect(res.body.rows[0]).toHaveProperty('total', 0);
  });

  it('counts visits per day correctly', async () => {
    const visit = {
      ...makeVisit('Discharged'),
      createdAt: new Date('2026-04-21T09:00:00Z'),
    };
    (Visit.findAll as jest.Mock).mockResolvedValue([visit]);

    const res = await request(app)
      .get('/api/reports/date-range?start_date=2026-04-20&end_date=2026-04-22')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    const april21 = res.body.rows.find((r: any) => r.date === '2026-04-21');
    expect(april21.total).toBe(1);
    expect(april21.completed).toBe(1);
  });
});

describe('GET /api/reports/stage-duration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when dates are missing', async () => {
    const res = await request(app)
      .get('/api/reports/stage-duration')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 with empty durations when no events', async () => {
    (StageEvent.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/reports/stage-duration?start_date=2026-04-01&end_date=2026-04-22')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.durations).toEqual([]);
    expect(res.body.period).toHaveProperty('start_date');
    expect(res.body.period).toHaveProperty('end_date');
  });

  it('calculates stage durations from events', async () => {
    const t1 = new Date('2026-04-22T08:00:00Z');
    const t2 = new Date('2026-04-22T09:30:00Z');
    const t3 = new Date('2026-04-22T10:00:00Z');

    const makeEvent = (visitId: number, createdAt: Date, stageName: string) => ({
      visit_id: visitId,
      createdAt,
      get: jest.fn((key: string) => {
        if (key === 'to_stage') return { name: stageName };
        return null;
      }),
    });

    (StageEvent.findAll as jest.Mock).mockResolvedValue([
      makeEvent(1, t1, 'Pre-Op Assessment'),
      makeEvent(1, t2, 'In Theatre'),
      makeEvent(1, t3, 'Recovery'),
    ]);

    const res = await request(app)
      .get('/api/reports/stage-duration?start_date=2026-04-22&end_date=2026-04-22')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.durations).toHaveLength(2);
    const preOp = res.body.durations.find((d: any) => d.stage_name === 'Pre-Op Assessment');
    expect(preOp).toBeDefined();
    expect(preOp.average_minutes).toBe(90);
  });
});

describe('GET /api/reports/audit-log', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/reports/audit-log');
    expect(res.status).toBe(401);
  });

  it('returns 200 with empty rows', async () => {
    (StageEvent.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });

    const res = await request(app)
      .get('/api/reports/audit-log')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(0);
    expect(res.body.rows).toEqual([]);
  });

  it('returns mapped rows with pagination support', async () => {
    const row = {
      id: 1,
      createdAt: new Date('2026-04-22T09:00:00Z'),
      notes: 'moved to theatre',
      visit: { visit_tracking_id: 'VT-001', patient: { first_name: 'John', last_name: 'Doe' } },
      from_stage: { name: 'Pre-Op Assessment', color: '#f39c12' },
      to_stage: { name: 'In Theatre', color: '#e74c3c' },
      updated_by_user: { name: 'Admin User', role: 'admin' },
    };
    (StageEvent.findAndCountAll as jest.Mock).mockResolvedValue({ count: 1, rows: [row] });

    const res = await request(app)
      .get('/api/reports/audit-log?limit=10&offset=0')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.rows[0].visit_tracking_id).toBe('VT-001');
    expect(res.body.rows[0].patient_name).toBe('John Doe');
    expect(res.body.rows[0].to_stage.name).toBe('In Theatre');
    expect(res.body.rows[0].updated_by.name).toBe('Admin User');
  });

  it('respects limit cap of 200', async () => {
    (StageEvent.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });

    await request(app)
      .get('/api/reports/audit-log?limit=500')
      .set('Authorization', `Bearer ${makeToken()}`);

    const callArgs = (StageEvent.findAndCountAll as jest.Mock).mock.calls[0][0];
    expect(callArgs.limit).toBe(200);
  });
});

describe('GET /api/reports/notification-config', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/reports/notification-config');
    expect(res.status).toBe(401);
  });

  it('returns notification config', async () => {
    const res = await request(app)
      .get('/api/reports/notification-config')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

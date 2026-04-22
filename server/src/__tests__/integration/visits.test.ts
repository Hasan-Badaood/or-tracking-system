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
jest.mock('../../models/BlacklistedToken', () => ({
  BlacklistedToken: {
    findOne: jest.fn().mockResolvedValue(null),
    upsert: jest.fn(),
    destroy: jest.fn(),
  },
}));
jest.mock('../../lib/tokenBlocklist', () => ({
  isBlacklisted: jest.fn().mockResolvedValue(false),
  addToBlocklist: jest.fn(),
}));
jest.mock('../../models/User', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
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

import request from 'supertest';
import app from '../../app';
import { Visit, Patient } from '../../models';
import jwt from 'jsonwebtoken';

const makeToken = (role = 'admin') =>
  jwt.sign({ id: 1, username: 'admin', role }, 'test-secret', { expiresIn: '1h' });

describe('GET /api/visits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/visits');

    expect(res.status).toBe(401);
  });

  it('returns 200 with empty list and pagination when no visits exist', async () => {
    (Visit.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });

    const res = await request(app)
      .get('/api/visits')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination).toEqual(expect.any(Object));
  });
});

describe('GET /api/visits/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns 404 when visit does not exist', async () => {
    (Visit.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/visits/999')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 with visit data when visit exists', async () => {
    (Visit.findByPk as jest.Mock).mockResolvedValue({
      id: 1,
      visit_tracking_id: 'VT-20260403-001',
      active: true,
      patient: { id: 1, mrn: 'MRN001', first_name: 'John', last_name: 'Doe' },
    });

    const res = await request(app)
      .get('/api/visits/1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

describe('DELETE /api/visits/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).delete('/api/visits/1');

    expect(res.status).toBe(401);
  });

  it('returns 404 when visit does not exist', async () => {
    (Visit.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/visits/999')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 and marks visit as inactive on success', async () => {
    const saveMock = jest.fn().mockResolvedValue(undefined);
    (Visit.findByPk as jest.Mock).mockResolvedValue({
      id: 1,
      visit_tracking_id: 'VT-20260403-001',
      active: true,
      save: saveMock,
    });

    const res = await request(app)
      .delete('/api/visits/1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(saveMock).toHaveBeenCalled();
  });
});

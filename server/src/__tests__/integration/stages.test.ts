jest.mock('../../config/database', () => ({
  sequelize: {
    transaction: jest.fn(),
  },
}));
jest.mock('../../models', () => ({
  Visit: { findByPk: jest.fn() },
  Stage: { findByPk: jest.fn() },
  StageEvent: { create: jest.fn(), findByPk: jest.fn(), findAll: jest.fn() },
  ORRoom: { findByPk: jest.fn() },
  User: { findByPk: jest.fn() },
  FamilyContact: {},
  Patient: {},
}));
jest.mock('../../models/CleaningTimer', () => ({
  CleaningTimer: { create: jest.fn() },
}));
jest.mock('../../services/notificationService', () => ({
  notifyFamilyContacts: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../lib/tokenBlocklist', () => ({
  isBlacklisted: jest.fn().mockResolvedValue(false),
  addToBlocklist: jest.fn(),
}));
jest.mock('../../models/BlacklistedToken', () => ({
  BlacklistedToken: {
    findOne: jest.fn().mockResolvedValue(null),
    upsert: jest.fn(),
    destroy: jest.fn(),
  },
}));
jest.mock('../../models/User', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
}));

import request from 'supertest';
import app from '../../app';
import { sequelize } from '../../config/database';
import { Visit, Stage, StageEvent } from '../../models';
import jwt from 'jsonwebtoken';

const makeToken = (role = 'nurse') =>
  jwt.sign({ id: 1, username: 'nurse1', role }, 'test-secret', { expiresIn: '1h' });

const mockTransaction = () => ({
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
});

const mockVisit = (fromOrder: number, fromName: string) => ({
  id: 1,
  visit_tracking_id: 'VT-20260404-001',
  current_stage_id: fromOrder,
  or_room_id: null,
  active: true,
  get: jest.fn((key: string) => {
    if (key === 'current_stage') return { id: fromOrder, name: fromName, display_order: fromOrder };
    return null;
  }),
  save: jest.fn().mockResolvedValue(undefined),
});

const mockStage = (order: number, name: string, active = true) => ({
  id: order,
  name,
  display_order: order,
  active,
});

describe('PUT /api/visits/:id/stage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).put('/api/visits/1/stage').send({ to_stage_id: 2 });

    expect(res.status).toBe(401);
  });

  it('returns 400 when to_stage_id is missing', async () => {
    const tx = mockTransaction();
    (sequelize.transaction as jest.Mock).mockResolvedValue(tx);
    (Visit.findByPk as jest.Mock).mockResolvedValue(mockVisit(1, 'Arrived'));

    const res = await request(app)
      .put('/api/visits/1/stage')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('to_stage_id is required');
  });

  it('returns 404 when visit is not found', async () => {
    const tx = mockTransaction();
    (sequelize.transaction as jest.Mock).mockResolvedValue(tx);
    (Visit.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .put('/api/visits/999/stage')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ to_stage_id: 2 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when to_stage_id references a non-existent stage', async () => {
    const tx = mockTransaction();
    (sequelize.transaction as jest.Mock).mockResolvedValue(tx);
    (Visit.findByPk as jest.Mock).mockResolvedValue(mockVisit(1, 'Arrived'));
    (Stage.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .put('/api/visits/1/stage')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ to_stage_id: 99 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid to_stage_id: stage not found');
  });

  it('returns 400 when trying to skip stages (order 1 to order 3)', async () => {
    const tx = mockTransaction();
    (sequelize.transaction as jest.Mock).mockResolvedValue(tx);
    (Visit.findByPk as jest.Mock).mockResolvedValue(mockVisit(1, 'Arrived'));
    (Stage.findByPk as jest.Mock).mockResolvedValue(mockStage(3, 'Pre-Op Ready'));

    const res = await request(app)
      .put('/api/visits/1/stage')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ to_stage_id: 3 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid stage transition');
  });

  it('returns 400 when trying to go backward (order 3 to order 2)', async () => {
    const tx = mockTransaction();
    (sequelize.transaction as jest.Mock).mockResolvedValue(tx);
    (Visit.findByPk as jest.Mock).mockResolvedValue(mockVisit(3, 'Pre-Op Ready'));
    (Stage.findByPk as jest.Mock).mockResolvedValue(mockStage(2, 'Pre-Op'));

    const res = await request(app)
      .put('/api/visits/1/stage')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ to_stage_id: 2 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid stage transition');
  });

  it('returns 400 when moving to In Theatre without or_room_id', async () => {
    const tx = mockTransaction();
    (sequelize.transaction as jest.Mock).mockResolvedValue(tx);
    (Visit.findByPk as jest.Mock).mockResolvedValue(mockVisit(3, 'Ready'));
    (Stage.findByPk as jest.Mock).mockResolvedValue(mockStage(4, 'In Theatre'));

    const res = await request(app)
      .put('/api/visits/1/stage')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ to_stage_id: 4 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('An OR room must be assigned when moving a patient to In Theatre');
  });

  it('returns 400 when or_room_id is provided for a non-theatre stage', async () => {
    const tx = mockTransaction();
    (sequelize.transaction as jest.Mock).mockResolvedValue(tx);
    (Visit.findByPk as jest.Mock).mockResolvedValue(mockVisit(1, 'Arrived'));
    (Stage.findByPk as jest.Mock).mockResolvedValue(mockStage(2, 'Pre-Op'));

    const res = await request(app)
      .put('/api/visits/1/stage')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ to_stage_id: 2, or_room_id: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('OR room can only be assigned when moving to In Theatre');
  });
});

jest.mock('../../config/database', () => ({
  sequelize: { transaction: jest.fn() },
}));
jest.mock('../../models', () => ({
  Visit: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn(), findAndCountAll: jest.fn() },
  Stage: { findByPk: jest.fn(), findOne: jest.fn() },
  Patient: { findOne: jest.fn(), create: jest.fn(), upsert: jest.fn() },
  StageEvent: { create: jest.fn(), findAndCountAll: jest.fn() },
  ORRoom: { findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  FamilyContact: { create: jest.fn() },
  User: { findByPk: jest.fn() },
}));
jest.mock('../../models/CleaningTimer', () => ({
  CleaningTimer: { create: jest.fn(), findOne: jest.fn(), destroy: jest.fn() },
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

import request from 'supertest';
import app from '../../app';
import { ORRoom } from '../../models';
import { CleaningTimer } from '../../models/CleaningTimer';
import jwt from 'jsonwebtoken';

const makeToken = (role = 'admin') =>
  jwt.sign({ id: 1, username: 'admin', role }, 'test-secret', { expiresIn: '1h' });

const makeRoom = (overrides: any = {}) => ({
  id: 1,
  room_number: 'OR-1',
  name: 'Operating Room 1',
  room_type: 'General',
  capacity: 'Standard',
  status: 'Available',
  last_status_change: new Date(),
  active: true,
  get: jest.fn().mockReturnValue(null),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('GET /api/rooms', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(401);
  });

  it('returns 200 with empty rooms list', async () => {
    (ORRoom.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.rooms).toEqual([]);
  });

  it('returns rooms with basic data', async () => {
    const room = makeRoom();
    (ORRoom.findAll as jest.Mock).mockResolvedValue([room]);

    const res = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.rooms).toHaveLength(1);
    expect(res.body.rooms[0].room_number).toBe('OR-1');
  });
});

describe('GET /api/rooms/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when room does not exist', async () => {
    (ORRoom.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/rooms/999')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 with room data when room exists', async () => {
    const room = makeRoom();
    (ORRoom.findByPk as jest.Mock).mockResolvedValue(room);

    const res = await request(app)
      .get('/api/rooms/1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.room.room_number).toBe('OR-1');
  });
});

describe('PUT /api/rooms/:id/status', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when status is missing', async () => {
    const res = await request(app)
      .put('/api/rooms/1/status')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .put('/api/rooms/1/status')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ status: 'Invalid' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 when room does not exist', async () => {
    (ORRoom.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .put('/api/rooms/999/status')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ status: 'Available' });

    expect(res.status).toBe(404);
  });

  it('returns 200 and updates status', async () => {
    const room = makeRoom();
    (ORRoom.findByPk as jest.Mock).mockResolvedValue(room);

    const res = await request(app)
      .put('/api/rooms/1/status')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ status: 'Maintenance' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(room.save).toHaveBeenCalled();
  });

  it('creates cleaning timer when status is set to Cleaning', async () => {
    const room = makeRoom({ id: 2 });
    (ORRoom.findByPk as jest.Mock).mockResolvedValue(room);
    (CleaningTimer.destroy as jest.Mock).mockResolvedValue(undefined);
    (CleaningTimer.create as jest.Mock).mockResolvedValue({ id: 1 });

    const res = await request(app)
      .put('/api/rooms/2/status')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ status: 'Cleaning' });

    expect(res.status).toBe(200);
    expect(CleaningTimer.create).toHaveBeenCalled();
  });
});

describe('POST /api/rooms', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${makeToken('nurse')}`)
      .send({ name: 'OR 2', room_number: 'OR-2' });

    expect(res.status).toBe(403);
  });

  it('returns 400 when name or room_number is missing', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'OR 2' });

    expect(res.status).toBe(400);
  });

  it('returns 409 when room number already exists', async () => {
    (ORRoom.findOne as jest.Mock).mockResolvedValue(makeRoom());

    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'OR Duplicate', room_number: 'OR-1' });

    expect(res.status).toBe(409);
  });

  it('returns 201 and creates room', async () => {
    (ORRoom.findOne as jest.Mock).mockResolvedValue(null);
    (ORRoom.create as jest.Mock).mockResolvedValue(makeRoom());

    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'OR New', room_number: 'OR-5' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('PUT /api/rooms/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .put('/api/rooms/1')
      .set('Authorization', `Bearer ${makeToken('nurse')}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(403);
  });

  it('returns 404 when room does not exist', async () => {
    (ORRoom.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .put('/api/rooms/999')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(404);
  });

  it('returns 200 and updates room', async () => {
    const room = makeRoom();
    (ORRoom.findByPk as jest.Mock).mockResolvedValue(room);

    const res = await request(app)
      .put('/api/rooms/1')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(room.save).toHaveBeenCalled();
  });
});

describe('DELETE /api/rooms/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .delete('/api/rooms/1')
      .set('Authorization', `Bearer ${makeToken('nurse')}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 when room does not exist', async () => {
    (ORRoom.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/rooms/999')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('returns 200 and deactivates room', async () => {
    const room = makeRoom();
    (ORRoom.findByPk as jest.Mock).mockResolvedValue(room);

    const res = await request(app)
      .delete('/api/rooms/1')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(room.active).toBe(false);
    expect(room.save).toHaveBeenCalled();
  });
});

describe('POST /api/rooms/:id/cleaning/start', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when room does not exist', async () => {
    (ORRoom.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/rooms/999/cleaning/start')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});

    expect(res.status).toBe(404);
  });

  it('returns 200 and creates cleaning timer', async () => {
    const room = makeRoom();
    (ORRoom.findByPk as jest.Mock).mockResolvedValue(room);
    (CleaningTimer.create as jest.Mock).mockResolvedValue({
      id: 1,
      room_id: 1,
      visit_id: null,
      started_at: new Date(),
      scheduled_end_at: new Date(),
      duration_minutes: 15,
      completed: false,
    });

    const res = await request(app)
      .post('/api/rooms/1/cleaning/start')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ duration_minutes: 20 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cleaning_timer).toBeDefined();
    expect(CleaningTimer.create).toHaveBeenCalled();
  });
});

describe('POST /api/rooms/:id/cleaning/complete', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when room does not exist', async () => {
    (ORRoom.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/rooms/999/cleaning/complete')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});

    expect(res.status).toBe(404);
  });

  it('returns 200 when no active timer exists', async () => {
    const room = makeRoom();
    (ORRoom.findByPk as jest.Mock).mockResolvedValue(room);
    (CleaningTimer.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/rooms/1/cleaning/complete')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.cleaning_timer).toBeNull();
  });

  it('returns 200 and completes the cleaning timer', async () => {
    const room = makeRoom();
    const timer = {
      id: 1,
      completed: false,
      actual_end_at: null,
      manually_overridden: false,
      override_reason: null,
      save: jest.fn().mockResolvedValue(undefined),
    };
    (ORRoom.findByPk as jest.Mock).mockResolvedValue(room);
    (CleaningTimer.findOne as jest.Mock).mockResolvedValue(timer);

    const res = await request(app)
      .post('/api/rooms/1/cleaning/complete')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ override_reason: 'done early' });

    expect(res.status).toBe(200);
    expect(timer.completed).toBe(true);
    expect(timer.manually_overridden).toBe(true);
    expect(timer.save).toHaveBeenCalled();
  });
});

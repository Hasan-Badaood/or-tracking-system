jest.mock('../../models', () => ({
  Visit: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn(), findAndCountAll: jest.fn() },
  Stage: { findByPk: jest.fn(), findOne: jest.fn() },
  Patient: { findOne: jest.fn(), create: jest.fn(), upsert: jest.fn() },
  StageEvent: { create: jest.fn() },
  ORRoom: { findByPk: jest.fn() },
  FamilyContact: { create: jest.fn() },
  User: { findByPk: jest.fn() },
}));
jest.mock('../../models/SystemSetting', () => ({
  SystemSetting: { findAll: jest.fn().mockResolvedValue([]), upsert: jest.fn() },
}));
jest.mock('../../models/CleaningTimer', () => ({
  CleaningTimer: { create: jest.fn() },
}));
jest.mock('../../services/notificationService', () => ({
  notifyFamilyContacts: jest.fn(),
}));
jest.mock('../../models/User', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
}));
jest.mock('../../lib/tokenBlocklist', () => ({
  isBlacklisted: jest.fn().mockResolvedValue(false),
  addToBlocklist: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../models/BlacklistedToken', () => ({
  BlacklistedToken: {
    findOne: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../../config/database', () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(undefined),
    sync: jest.fn().mockResolvedValue(undefined),
    transaction: jest.fn().mockResolvedValue({
      commit: jest.fn(),
      rollback: jest.fn(),
    }),
  },
}));

import request from 'supertest';
import app from '../../app';
import { User } from '../../models/User';
import { isBlacklisted } from '../../lib/tokenBlocklist';
import jwt from 'jsonwebtoken';

const makeToken = (payload = { id: 1, username: 'admin', role: 'admin' }) =>
  jwt.sign(payload, 'test-secret', { expiresIn: '1h' });

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isBlacklisted as jest.Mock).mockResolvedValue(false);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns 400 when username is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when user is not found', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({ username: 'nobody', password: 'pass' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 when user account is inactive', async () => {
    (User.findOne as jest.Mock).mockResolvedValue({
      active: false,
      comparePassword: jest.fn(),
    });

    const res = await request(app).post('/api/auth/login').send({ username: 'inactive', password: 'pass' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when password is wrong', async () => {
    (User.findOne as jest.Mock).mockResolvedValue({
      active: true,
      comparePassword: jest.fn().mockResolvedValue(false),
      save: jest.fn(),
    });

    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 with token on successful login', async () => {
    (User.findOne as jest.Mock).mockResolvedValue({
      id: 1,
      username: 'admin',
      name: 'Admin User',
      role: 'admin',
      active: true,
      last_login: null,
      comparePassword: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(undefined),
    });

    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'correct' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.role).toBe('admin');
  });
});

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isBlacklisted as jest.Mock).mockResolvedValue(false);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns 200 with success when authenticated', async () => {
    const token = makeToken();

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isBlacklisted as jest.Mock).mockResolvedValue(false);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('returns 401 with revoked error when token is blacklisted', async () => {
    (isBlacklisted as jest.Mock).mockResolvedValue(true);
    const token = makeToken();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token has been revoked');
  });

  it('returns 200 with user data when authenticated', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({
      id: 1,
      username: 'admin',
      name: 'Admin User',
      role: 'admin',
      email: 'admin@example.com',
      active: true,
    });

    const token = makeToken();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe('admin');
  });
});

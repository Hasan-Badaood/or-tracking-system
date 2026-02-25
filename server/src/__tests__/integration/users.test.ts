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
  User: { findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  UserAuditLog: { create: jest.fn(), findAndCountAll: jest.fn() },
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
  User: { findOne: jest.fn(), findByPk: jest.fn(), findAll: jest.fn(), create: jest.fn() },
}));
jest.mock('../../lib/mailer', () => ({
  sendCredentialsEmail: jest.fn().mockResolvedValue(undefined),
  sendOTPEmail: jest.fn().mockResolvedValue(undefined),
  sendOTPSms: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../../app';
import { User, UserAuditLog } from '../../models';
import jwt from 'jsonwebtoken';

const makeToken = (role = 'admin', id = 1) =>
  jwt.sign({ id, username: 'admin', role }, 'test-secret', { expiresIn: '1h' });

const makeUser = (overrides: any = {}) => ({
  id: 1,
  username: 'testuser',
  name: 'Test User',
  role: 'nurse',
  email: 'test@example.com',
  phone: null,
  active: true,
  password_hash: '$2a$10$hash',
  last_login: null,
  created_at: new Date(),
  updated_at: new Date(),
  comparePassword: jest.fn().mockResolvedValue(true),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('GET /api/users', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('returns 200 with list of users', async () => {
    (User.findAll as jest.Mock).mockResolvedValue([makeUser()]);

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.users).toHaveLength(1);
  });

  it('returns 200 with empty list when no users', async () => {
    (User.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([]);
  });
});

describe('POST /api/users', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ username: 'newuser' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid role', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ username: 'newuser', password: 'pass123', name: 'New User', role: 'superadmin' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 409 when username already exists', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(makeUser());

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ username: 'testuser', password: 'pass123', name: 'New User', role: 'nurse' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('returns 201 and creates user', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    (User.create as jest.Mock).mockResolvedValue(makeUser({ id: 2 }));
    (UserAuditLog.create as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ username: 'newuser', password: 'pass123', name: 'New User', role: 'nurse' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('PUT /api/users/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when user not found', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .put('/api/users/999')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid role update', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue(makeUser());

    const res = await request(app)
      .put('/api/users/1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ role: 'superadmin' });

    expect(res.status).toBe(400);
  });

  it('returns 409 when new username is taken', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue(makeUser({ id: 1 }));
    (User.findOne as jest.Mock).mockResolvedValue(makeUser({ id: 2 }));

    const res = await request(app)
      .put('/api/users/1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ username: 'takenuser' });

    expect(res.status).toBe(409);
  });

  it('returns 400 when new password is too short', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue(makeUser());

    const res = await request(app)
      .put('/api/users/1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ new_password: 'abc' });

    expect(res.status).toBe(400);
  });

  it('returns 200 and updates user', async () => {
    const user = makeUser();
    (User.findByPk as jest.Mock).mockResolvedValue(user);
    (UserAuditLog.create as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .put('/api/users/1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(user.save).toHaveBeenCalled();
  });
});

describe('GET /api/users/audit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .get('/api/users/audit')
      .set('Authorization', `Bearer ${makeToken('nurse')}`);

    expect(res.status).toBe(403);
  });

  it('returns 200 with audit log for admin', async () => {
    (UserAuditLog.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });
    (User.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/users/audit')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(0);
  });
});

describe('PUT /api/users/:id/password', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when new_password is missing', async () => {
    const res = await request(app)
      .put('/api/users/1/password')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when new password is too short', async () => {
    const res = await request(app)
      .put('/api/users/1/password')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ new_password: 'abc' });

    expect(res.status).toBe(400);
  });

  it('returns 403 when non-admin changes another user password', async () => {
    const res = await request(app)
      .put('/api/users/99/password')
      .set('Authorization', `Bearer ${makeToken('nurse', 1)}`)
      .send({ new_password: 'newpassword123' });

    expect(res.status).toBe(403);
  });

  it('returns 404 when user not found', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .put('/api/users/999/password')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ new_password: 'newpassword123' });

    expect(res.status).toBe(404);
  });

  it('returns 200 when admin changes any password', async () => {
    const user = makeUser({ id: 2 });
    (User.findByPk as jest.Mock).mockResolvedValue(user);
    (UserAuditLog.create as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .put('/api/users/2/password')
      .set('Authorization', `Bearer ${makeToken('admin', 1)}`)
      .send({ new_password: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 401 when current password is incorrect for own account', async () => {
    const user = makeUser({ id: 1, comparePassword: jest.fn().mockResolvedValue(false) });
    (User.findByPk as jest.Mock).mockResolvedValue(user);

    const res = await request(app)
      .put('/api/users/1/password')
      .set('Authorization', `Bearer ${makeToken('nurse', 1)}`)
      .send({ current_password: 'wrongpass', new_password: 'newpassword123' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/users/:id/send-credentials', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .post('/api/users/1/send-credentials')
      .set('Authorization', `Bearer ${makeToken('nurse')}`)
      .send({ password: 'pass123' });

    expect(res.status).toBe(403);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/users/1/send-credentials')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 404 when user not found', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/users/999/send-credentials')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ password: 'pass123' });

    expect(res.status).toBe(404);
  });

  it('returns 400 when user has no email', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue(makeUser({ email: null }));

    const res = await request(app)
      .post('/api/users/1/send-credentials')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ password: 'pass123' });

    expect(res.status).toBe(400);
  });

  it('returns 200 and sends credentials email', async () => {
    const { sendCredentialsEmail } = require('../../lib/mailer');
    (User.findByPk as jest.Mock).mockResolvedValue(makeUser({ email: 'user@example.com' }));

    const res = await request(app)
      .post('/api/users/1/send-credentials')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ password: 'pass123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(sendCredentialsEmail).toHaveBeenCalled();
  });
});

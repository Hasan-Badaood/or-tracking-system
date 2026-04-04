import jwt from 'jsonwebtoken';

jest.mock('../../../lib/tokenBlocklist', () => ({
  isBlacklisted: jest.fn(),
}));

import { isBlacklisted } from '../../../lib/tokenBlocklist';
import { authenticate } from '../../../middleware/auth';

const mockIsBlacklisted = isBlacklisted as jest.Mock;

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (authHeader?: string): any => ({
  headers: authHeader ? { authorization: authHeader } : {},
});

describe('authenticate middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 when no Authorization header is present', async () => {
    const req = makeReq();
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const req = makeReq('Basic sometoken');
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is blacklisted', async () => {
    mockIsBlacklisted.mockResolvedValue(true);

    const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, 'test-secret', { expiresIn: '1h' });
    const req = makeReq(`Bearer ${token}`);
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token has been revoked' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', async () => {
    mockIsBlacklisted.mockResolvedValue(false);

    const req = makeReq('Bearer not.a.valid.token');
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets req.user when token is valid', async () => {
    mockIsBlacklisted.mockResolvedValue(false);

    const payload = { id: 1, username: 'admin', role: 'admin' };
    const token = jwt.sign(payload, 'test-secret', { expiresIn: '1h' });
    const req = makeReq(`Bearer ${token}`);
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject(payload);
    expect(res.status).not.toHaveBeenCalled();
  });
});

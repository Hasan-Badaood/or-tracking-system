import { checkPermission, checkRole } from '../../../middleware/permissions';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (user?: { id: number; username: string; role: string }): any => ({ user });

describe('checkPermission middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('calls next() when admin has manage_users permission', () => {
    const middleware = checkPermission('manage_users');
    const req = makeReq({ id: 1, username: 'admin', role: 'admin' });
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() when admin has update_stage permission', () => {
    const middleware = checkPermission('update_stage');
    const req = makeReq({ id: 1, username: 'admin', role: 'admin' });
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when nurse tries to use manage_users', () => {
    const middleware = checkPermission('manage_users');
    const req = makeReq({ id: 2, username: 'nurse1', role: 'nurse' });
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Insufficient permissions' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when nurse has update_stage permission', () => {
    const middleware = checkPermission('update_stage');
    const req = makeReq({ id: 2, username: 'nurse1', role: 'nurse' });
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when reception tries to use update_stage', () => {
    const middleware = checkPermission('update_stage');
    const req = makeReq({ id: 3, username: 'reception1', role: 'reception' });
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Insufficient permissions', required: 'update_stage' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when reception has create_visit permission', () => {
    const middleware = checkPermission('create_visit');
    const req = makeReq({ id: 3, username: 'reception1', role: 'reception' });
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('returns 401 when req.user is missing', () => {
    const middleware = checkPermission('view_visits');
    const req = makeReq(undefined);
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Not authenticated' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user has an unknown role', () => {
    const middleware = checkPermission('view_visits');
    const req = makeReq({ id: 99, username: 'ghost', role: 'unknown_role' });
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('checkRole middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('calls next() when admin is in the allowed roles list', () => {
    const middleware = checkRole(['admin']);
    const req = makeReq({ id: 1, username: 'admin', role: 'admin' });
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() when nurse is in the allowed roles list', () => {
    const middleware = checkRole(['nurse', 'admin']);
    const req = makeReq({ id: 2, username: 'nurse1', role: 'nurse' });
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when reception is not in allowed roles', () => {
    const middleware = checkRole(['nurse', 'admin']);
    const req = makeReq({ id: 3, username: 'reception1', role: 'reception' });
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Access denied', allowed_roles: ['nurse', 'admin'] })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when req.user is missing', () => {
    const middleware = checkRole(['admin']);
    const req = makeReq(undefined);
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Not authenticated' })
    );
    expect(next).not.toHaveBeenCalled();
  });
});

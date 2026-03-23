import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, UserAuditLog } from '../models';
import { sendCredentialsEmail } from '../lib/mailer';

interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// GET /users - List all staff users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const { role, active } = req.query;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (active !== undefined) {
      where.active = active === 'true';
    }

    const users = await User.findAll({
      where,
      attributes: ['id', 'username', 'name', 'role', 'email', 'active', 'last_login', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// POST /users - Create new staff user
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, name, role, email, phone } = req.body;

    // Validation
    if (!username || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        error: 'Username, password, name, and role are required'
      });
    }

    const validRoles = ['reception', 'nurse', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        valid_roles: validRoles
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Username already exists'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      username,
      password_hash,
      name,
      role,
      email: email || null,
      phone: phone || null,
      active: true
    });

    if (req.user) {
      await UserAuditLog.create({
        performed_by_id: req.user.id,
        target_user_id: user.id,
        action: 'create',
        changes: JSON.stringify({ username, name, role, email: email || null }),
      });
    }

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        active: user.active,
        created_at: user.created_at
      },
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// PUT /users/:id - Update user details
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, active, role, username, new_password } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const changedFields: Record<string, { from: any; to: any }> = {};

    const track = (field: string, oldVal: any, newVal: any) => {
      if (newVal !== undefined && newVal !== oldVal) {
        changedFields[field] = { from: oldVal, to: newVal };
      }
    };

    if (name     !== undefined) { track('name',   user.name,   name);   user.name   = name; }
    if (email    !== undefined) { track('email',  user.email,  email);  user.email  = email; }
    if (phone    !== undefined) { track('phone',  user.phone,  phone);  user.phone  = phone; }
    if (active   !== undefined) { track('active', user.active, active); user.active = active; }

    if (role !== undefined) {
      const validRoles = ['reception', 'nurse', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role' });
      }
      track('role', user.role, role);
      user.role = role;
    }

    if (username !== undefined) {
      const taken = await User.findOne({ where: { username } });
      if (taken && taken.id !== user.id) {
        return res.status(409).json({ success: false, error: 'Username already taken' });
      }
      track('username', user.username, username);
      user.username = username;
    }

    if (new_password !== undefined && new_password !== '') {
      if (new_password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
      }
      user.password_hash = await bcrypt.hash(new_password, 10);
      changedFields['password'] = { from: '***', to: '***' };
    }

    await user.save();

    if (req.user && Object.keys(changedFields).length > 0) {
      const action = active !== undefined && Object.keys(changedFields).length === 1
        ? (active ? 'activate' : 'deactivate')
        : 'update';
      await UserAuditLog.create({
        performed_by_id: req.user.id,
        target_user_id: user.id,
        action,
        changes: JSON.stringify(changedFields),
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        active: user.active,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET /users/audit - User management audit log
export const getUserAuditLog = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const limit  = Math.min(parseInt(req.query.limit  as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const { count, rows } = await UserAuditLog.findAndCountAll({
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    // Enrich with user names
    const userIds = [...new Set(rows.flatMap((r) => [r.performed_by_id, r.target_user_id]))];
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'name', 'username', 'role'],
    });
    const userMap: Record<number, any> = {};
    for (const u of users) userMap[u.id] = u;

    const enriched = rows.map((r) => ({
      id: r.id,
      created_at: (r as any).createdAt ?? r.created_at,
      action: r.action,
      performed_by: userMap[r.performed_by_id] ?? null,
      target_user:  userMap[r.target_user_id]  ?? null,
      changes: r.changes ? JSON.parse(r.changes) : null,
    }));

    res.json({ success: true, total: count, rows: enriched });
  } catch (error) {
    console.error('User audit log error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PUT /users/:id/password - Change user password
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { current_password, new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({ success: false, error: 'new_password is required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const isOwnAccount = req.user && req.user.id === parseInt(id);
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isOwnAccount && !isAdmin) {
      return res.status(403).json({ success: false, error: 'You can only change your own password' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Require current password only when the user is changing their own password
    if (isOwnAccount && !isAdmin) {
      if (!current_password) {
        return res.status(400).json({ success: false, error: 'current_password is required' });
      }
      const validPassword = await user.comparePassword(current_password);
      if (!validPassword) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }
    }

    // Hash and update new password
    user.password_hash = await bcrypt.hash(new_password, 10);
    await user.save();

    if (req.user) {
      await UserAuditLog.create({
        performed_by_id: req.user.id,
        target_user_id: user.id,
        action: 'password_reset',
        changes: null,
      });
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// POST /users/:id/send-credentials - Email login details to a staff user
export const sendUserCredentials = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { id } = req.params;
    const { password, login_url } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: 'password is required' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (!user.email) {
      return res.status(400).json({ success: false, error: 'User has no email address set' });
    }

    await sendCredentialsEmail(user.email, user.name, user.username, password, login_url ?? '');

    res.json({ success: true, message: `Login details sent to ${user.email}` });
  } catch (error: any) {
    console.error('Send credentials error:', error);
    res.status(500).json({ success: false, error: error.message ?? 'Failed to send email' });
  }
};

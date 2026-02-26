import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models';

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
    const { name, email, phone, active } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (active !== undefined) user.active = active;

    await user.save();

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        active: user.active,
        updated_at: user.updated_at
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// PUT /users/:id/password - Change user password
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    // Check if user is changing their own password or is admin
    const isOwnAccount = req.user && req.user.id === parseInt(id);
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isOwnAccount && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'You can only change your own password'
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password (only if changing own password)
    if (isOwnAccount) {
      const validPassword = await user.comparePassword(current_password);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }
    }

    // Hash and update new password
    user.password_hash = await bcrypt.hash(new_password, 10);
    await user.save();

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

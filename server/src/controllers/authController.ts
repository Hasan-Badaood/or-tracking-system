import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { addToBlocklist } from '../lib/tokenBlocklist';

interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// Helper to define permissions based on role
const getRolePermissions = (role: string): string[] => {
  const permissions: Record<string, string[]> = {
    admin: ['view_visits', 'create_visit', 'edit_visit_details', 'delete_visit', 'update_stage', 'view_stage_history', 'view_or_status', 'update_or_status', 'manage_users', 'view_reports', 'print_barcode', 'scan_barcode'],
    nurse: ['view_visits', 'update_stage', 'view_stage_history', 'view_or_status', 'scan_barcode'],
    reception: ['view_visits', 'create_visit', 'edit_visit_details', 'view_stage_history', 'print_barcode', 'scan_barcode']
  };
  return permissions[role] || [];
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive'
      });
    }

    const validPassword = await user.comparePassword(password);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: getRolePermissions(user.role)
      },
      expiresIn: '8h'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.decode(token) as { exp?: number } | null;
      const expiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now() + 8 * 60 * 60 * 1000;
      addToBlocklist(token, expiresAt);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'name', 'role', 'email', 'active']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
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
        active: user.active
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

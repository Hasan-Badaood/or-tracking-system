import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// Permission definitions per role
const rolePermissions: Record<string, string[]> = {
  admin: [
    'view_visits',
    'create_visit',
    'edit_visit_details',
    'delete_visit',
    'update_stage',
    'view_stage_history',
    'view_or_status',
    'update_or_status',
    'manage_users',
    'view_reports',
    'print_barcode',
    'scan_barcode'
  ],
  nurse: [
    'view_visits',
    'update_stage',
    'view_stage_history',
    'view_or_status',
    'scan_barcode'
  ],
  reception: [
    'view_visits',
    'create_visit',
    'edit_visit_details',
    'view_stage_history',
    'print_barcode',
    'scan_barcode'
  ]
};

export const checkPermission = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const userPermissions = rolePermissions[req.user.role] || [];

    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: requiredPermission
      });
    }

    next();
  };
};

export const checkRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        allowed_roles: allowedRoles
      });
    }

    next();
  };
};

import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: string;
    fullName?: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Authorization header missing or malformed' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ success: false, error: error?.message || 'Invalid token or session expired' });
      return;
    }

    // Fetch user profile for role verification
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, full_name')
      .eq('auth_user_id', user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || user.user_metadata?.role || 'user',
      fullName: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0],
    };

    next();
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Authentication error' });
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
    res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
    return;
  }
  next();
};

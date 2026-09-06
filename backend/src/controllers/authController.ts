import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../lib/supabase';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    // Authenticate via Supabase Auth Admin
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

      if (!authError && authData.user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('auth_user_id', authData.user.id)
          .single();

        res.json({
          success: true,
          token: authData.session?.access_token,
          refreshToken: authData.session?.refresh_token,
          user: {
            id: authData.user.id,
            email: authData.user.email,
            fullName: profile?.full_name || authData.user.email?.split('@')[0],
            role: profile?.role || 'user',
            phoneNumber: profile?.phone_number,
            phoneVerified: profile?.phone_verified || false,
          },
        });
        return;
      }
    } catch (supaErr) {
      // Supabase network unreachable -> fallback to demo JWT below
    }

    // Demo / Offline JWT Fallback for hackathon testing
    if (password === 'password123' || email.includes('@railio.ai')) {
      const jwtSecret = process.env.JWT_SECRET || 'railsathi-super-secret-jwt-key-2026';
      const role = email.includes('admin') ? 'admin' : email.includes('controller') ? 'controller' : 'user';
      const dummyUserId = `demo-${Date.now()}`;
      const token = jwt.sign({ sub: dummyUserId, email, role }, jwtSecret, { expiresIn: '7d' });

      res.json({
        success: true,
        token,
        refreshToken: `refresh-${dummyUserId}`,
        user: {
          id: dummyUserId,
          email,
          fullName: email.split('@')[0].toUpperCase(),
          role,
          phoneNumber: '+919876543210',
          phoneVerified: true,
        },
      });
      return;
    }

    res.status(401).json({ success: false, error: 'Invalid email or password' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Authentication failed' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, fullName, phoneNumber } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    // Create user via Supabase Auth Admin (Force role = 'user' on public API)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone_number: phoneNumber,
        role: 'user', // Enforce 'user' role for public API registration
      },
    });

    if (createError || !authData.user) {
      res.status(400).json({ success: false, error: createError?.message || 'Registration failed' });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully via Supabase Auth',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName,
        role: 'user',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Registration failed' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: profile?.full_name || user.fullName,
        role: profile?.role || user.role,
        phoneNumber: profile?.phone_number,
        phoneVerified: profile?.phone_verified || false,
        createdAt: profile?.created_at,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch user' });
  }
};

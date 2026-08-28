import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../models/dataStore';

const JWT_SECRET = process.env.JWT_SECRET || 'railsathi-super-secret-jwt-key-2026';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body;

    // Quick demo matching
    const user = db.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());

    if (!user && !email.includes('demo')) {
      // Demo auto-register for convenience in hackathons
      const newUser = {
        id: `usr-${Date.now()}`,
        email,
        password,
        fullName: email.split('@')[0] || 'Rail Passenger',
        role: role || 'PASSENGER',
        phoneNumber: '+91 98765 00000',
      };
      db.users.push(newUser);
      const token = jwt.sign({ id: newUser.id, role: newUser.role, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ success: true, token, user: newUser });
      return;
    }

    const matched = user || db.users[0];
    const token = jwt.sign({ id: matched.id, role: matched.role, email: matched.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: matched.id,
        email: matched.email,
        fullName: matched.fullName,
        role: matched.role,
        phoneNumber: matched.phoneNumber,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, fullName, role, phoneNumber } = req.body;

    if (db.users.some((u) => u.email === email)) {
      res.status(400).json({ success: false, error: 'User already registered' });
      return;
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      email,
      password,
      fullName: fullName || 'Rail User',
      role: role || 'PASSENGER',
      phoneNumber: phoneNumber || '+91 90000 00000',
    };

    db.users.push(newUser);
    const token = jwt.sign({ id: newUser.id, role: newUser.role, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ success: true, token, user: newUser });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
};

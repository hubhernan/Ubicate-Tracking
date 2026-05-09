import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const register = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { email, password, fullName, phone, role } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO users (email, password_hash, full_name, phone_number, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, full_name, role`,
      [email, passwordHash, fullName, phone, role || 'asset']
    );
    
    const newUser = result.rows[0];

    // Auto-create a tracking asset (their phone)
    await client.query(
      `INSERT INTO assets (user_id, name, type, metadata) 
       VALUES ($1, $2, $3, $4)`,
      [newUser.id, `Celular de ${fullName.split(' ')[0]}`, 'person', JSON.stringify({ autoCreated: true, color: '#3b82f6' })]
    );

    await client.query('COMMIT');
    res.status(201).json(newUser);
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

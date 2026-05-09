import { Request, Response } from 'express';
import pool from '../config/db';

// Generates a random 6-character alphanumeric invite code
const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createGroup = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { name, userId } = req.body;
    
    if (!name || !userId) {
      return res.status(400).json({ error: 'Name and userId are required' });
    }

    await client.query('BEGIN');

    // Create the group
    const inviteCode = generateInviteCode();
    const groupResult = await client.query(
      `INSERT INTO groups (name, invite_code, created_by) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [name, inviteCode, userId]
    );
    const newGroup = groupResult.rows[0];

    // Add creator as an admin member
    await client.query(
      `INSERT INTO group_members (group_id, user_id, role) 
       VALUES ($1, $2, 'admin')`,
      [newGroup.id, userId]
    );

    await client.query('COMMIT');
    res.status(201).json(newGroup);
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const joinGroup = async (req: Request, res: Response) => {
  try {
    const { inviteCode, userId } = req.body;

    if (!inviteCode || !userId) {
      return res.status(400).json({ error: 'inviteCode and userId are required' });
    }

    // Find group by invite code
    const groupResult = await pool.query(
      `SELECT id FROM groups WHERE invite_code = $1`,
      [inviteCode]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Código de invitación inválido' });
    }

    const groupId = groupResult.rows[0].id;

    // Check if user is already a member
    const memberCheck = await pool.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Ya eres miembro de esta familia' });
    }

    // Add user as a member
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role) 
       VALUES ($1, $2, 'member')`,
      [groupId, userId]
    );

    // Get the updated group info to return
    const groupInfo = await pool.query(`SELECT * FROM groups WHERE id = $1`, [groupId]);
    
    res.json({ message: 'Unido exitosamente', group: groupInfo.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserGroups = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT g.*, gm.role, gm.joined_at 
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = $1
       ORDER BY gm.joined_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getGroupMembers = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, gm.role, gm.joined_at 
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.role ASC, u.full_name ASC`,
      [groupId]
    );

    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

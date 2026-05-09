import { Request, Response } from 'express';
import pool from '../config/db';

export const updateDrivingMode = async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const { mode, speedLimit } = req.body;
    
    const result = await pool.query(
      `UPDATE assets SET 
       driving_mode = $1, 
       speed_limit = $2 
       WHERE id = $3 
       RETURNING *`,
      [mode, speedLimit, assetId]
    );
    
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createAsset = async (req: Request, res: Response) => {
  try {
    const { name, type, userId, metadata } = req.body;
    const result = await pool.query(
      `INSERT INTO assets (name, type, user_id, metadata) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, type, userId, JSON.stringify(metadata)]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAssets = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, type, status, last_updated, battery_level, 
       ST_X(last_position) as lng, ST_Y(last_position) as lat 
       FROM assets`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAssetConfig = async (assetId: string) => {
  const result = await pool.query(
    `SELECT driving_mode, speed_limit FROM assets WHERE id = $1`,
    [assetId]
  );
  return result.rows[0];
};

export const updateAsset = async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const { name, type } = req.body;
    const result = await pool.query(
      `UPDATE assets SET name = $1, type = $2 WHERE id = $3 RETURNING *`,
      [name, type, assetId]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteAsset = async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    
    // First delete dependent geofence_events and positions
    await pool.query(`DELETE FROM geofence_events WHERE asset_id = $1`, [assetId]);
    await pool.query(`DELETE FROM positions WHERE asset_id = $1`, [assetId]);
    
    // Then delete the asset
    await pool.query(`DELETE FROM assets WHERE id = $1`, [assetId]);
    
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

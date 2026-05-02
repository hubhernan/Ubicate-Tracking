import { Request, Response } from 'express';
import pool from '../config/db';

export const createGeofence = async (req: Request, res: Response) => {
  try {
    const { name, description, type, geometry } = req.body;
    // geometry should be a GeoJSON object
    const result = await pool.query(
      `INSERT INTO geofences (name, description, type, geom) 
       VALUES ($1, $2, $3, ST_GeomFromGeoJSON($4)) 
       RETURNING *`,
      [name, description, type, JSON.stringify(geometry)]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getGeofences = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, type, ST_AsGeoJSON(geom)::json as geometry FROM geofences`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const checkPosition = async (assetId: string, lat: number, lng: number) => {
  try {
    const point = `POINT(${lng} ${lat})`;
    const result = await pool.query(
      `SELECT id, name FROM geofences 
       WHERE ST_Within(ST_SetSRID(ST_GeomFromText($1), 4326), geom)`,
      [point]
    );
    return result.rows;
  } catch (error) {
    console.error('Error checking geofence:', error);
    return [];
  }
};

import pool from '../config/db';

export const savePosition = async (assetId: string, lat: number, lng: number, speed: number, heading: number, accuracy: number) => {
  try {
    const point = `POINT(${lng} ${lat})`;
    await pool.query(
      `INSERT INTO positions (asset_id, geom, speed, heading, accuracy) 
       VALUES ($1, ST_SetSRID(ST_GeomFromText($2), 4326), $3, $4, $5)`,
      [assetId, point, speed, heading, accuracy]
    );
    
    // Also update the asset's last known position
    await pool.query(
      `UPDATE assets SET 
       last_position = ST_SetSRID(ST_GeomFromText($1), 4326),
       last_updated = NOW(),
       status = 'moving'
       WHERE id = $2`,
      [point, assetId]
    );
  } catch (error) {
    console.error('Error saving position:', error);
  }
};

export const getHistory = async (assetId: string, start: string, end: string) => {
  try {
    const result = await pool.query(
      `SELECT id, ST_AsGeoJSON(geom)::json as geometry, speed, heading, accuracy, captured_at 
       FROM positions 
       WHERE asset_id = $1 AND captured_at BETWEEN $2 AND $3
       ORDER BY captured_at ASC`,
      [assetId, start, end]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching history:', error);
    return [];
  }
};

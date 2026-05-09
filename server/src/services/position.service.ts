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

export const getWeeklyAnalytics = async () => {
  try {
    const result = await pool.query(
      `WITH last_7_days AS (
          SELECT (CURRENT_DATE - i) AS date_val, TO_CHAR(CURRENT_DATE - i, 'Dy') as name
          FROM generate_series(0, 6) i
      ),
      daily_asset_lines AS (
          SELECT 
              DATE(captured_at) as date_val,
              asset_id,
              CASE 
                  WHEN COUNT(*) > 1 THEN ST_MakeLine(geom ORDER BY captured_at ASC)
                  ELSE NULL 
              END as line_geom
          FROM positions
          WHERE captured_at >= CURRENT_DATE - INTERVAL '6 days'
          GROUP BY DATE(captured_at), asset_id
      )
      SELECT 
          d.name,
          COALESCE(SUM(ST_Length(al.line_geom::geography) / 1000), 0) as distance
      FROM last_7_days d
      LEFT JOIN daily_asset_lines al ON d.date_val = al.date_val
      GROUP BY d.date_val, d.name
      ORDER BY d.date_val ASC;`
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching weekly analytics:', error);
    return [];
  }
};

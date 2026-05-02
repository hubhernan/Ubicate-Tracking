import { Router } from 'express';
import { createGeofence, getGeofences } from '../controllers/geofence.controller';

const router = Router();

router.post('/', createGeofence);
router.get('/', getGeofences);

export default router;

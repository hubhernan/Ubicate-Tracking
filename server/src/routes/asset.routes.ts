import { Router } from 'express';
import { updateDrivingMode, createAsset, getAssets } from '../controllers/asset.controller';

const router = Router();

router.get('/', getAssets);
router.post('/', createAsset);
router.patch('/:assetId/mode', updateDrivingMode);

export default router;

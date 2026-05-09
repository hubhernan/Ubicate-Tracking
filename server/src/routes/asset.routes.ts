import { Router } from 'express';
import { updateDrivingMode, createAsset, getAssets, updateAsset, deleteAsset } from '../controllers/asset.controller';

const router = Router();

router.get('/', getAssets);
router.post('/', createAsset);
router.put('/:assetId', updateAsset);
router.delete('/:assetId', deleteAsset);
router.patch('/:assetId/mode', updateDrivingMode);

export default router;

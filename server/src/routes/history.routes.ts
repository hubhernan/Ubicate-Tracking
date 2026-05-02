import { Router } from 'express';
import { getHistory } from '../services/position.service';

const router = Router();

router.get('/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    const { start, end } = req.query;
    const history = await getHistory(assetId, start as string, end as string);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

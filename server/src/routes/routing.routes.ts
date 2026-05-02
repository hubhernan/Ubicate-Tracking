import { Router } from 'express';
import { calculateOptimizedRoute } from '../services/routing.service';

const router = Router();

router.post('/calculate', async (req, res) => {
  try {
    const { origin, destination, via, transportMode, routingMode } = req.body;
    const route = await calculateOptimizedRoute(origin, destination, via, transportMode, routingMode);
    res.json(route);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

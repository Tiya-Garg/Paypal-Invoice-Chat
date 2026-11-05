import { Router, type Request, type Response } from 'express';
import { defaultMetrics } from '../config/metrics.js';

export const metricsRouter = Router();

metricsRouter.get('/metrics', (_req: Request, res: Response) => {
  res.status(200).json(defaultMetrics.getSnapshot());
});

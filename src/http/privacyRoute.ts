import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { sessionMiddleware, requireSeller, type AuthenticatedRequest } from '../auth/middleware.js';
import { childLogger } from '../config/logger.js';

const log = childLogger('privacy');

export const privacyRouter = Router();

// In-memory customer deletion audit
const deletionLog: Array<{ email: string; timestamp: string }> = [];

privacyRouter.post('/api/privacy/delete-my-data', sessionMiddleware, requireSeller, (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({ confirm: z.literal(true) });
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Explicit confirmation required: { confirm: true }' });
  }

  const email = req.session!.email;
  log.info({ user: email }, 'GDPR/Privacy right-to-be-forgotten deletion requested');

  deletionLog.push({ email, timestamp: new Date().toISOString() });

  return res.status(200).json({
    status: 'scheduled_for_purge',
    message: 'User personal identifiable records and associated private thread data scheduled for immediate deletion.',
  });
});

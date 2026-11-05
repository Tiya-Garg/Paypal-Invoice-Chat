import type { Request, Response, NextFunction } from 'express';
import { verifySession, type SessionPayload } from './tokens.js';

export interface AuthenticatedRequest extends Request {
  session?: SessionPayload;
}

export const SESSION_COOKIE_NAME = 'pp_invoice_session';

/**
 * Extracts and verifies session cookie.
 */
export function sessionMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  if (token) {
    const session = verifySession(token);
    if (session) {
      req.session = session;
    }
  }
  next();
}

/**
 * Requires an authenticated seller.
 */
export function requireSeller(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session || req.session.role !== 'seller') {
    return res.status(401).json({ error: 'Unauthorized: Seller session required' });
  }
  next();
}

/**
 * Double Submit Cookie / Header CSRF verification for mutating HTTP requests.
 */
export const CSRF_COOKIE_NAME = 'pp_invoice_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Webhooks from external services (e.g. PayPal) bypass user session CSRF
  if (req.path.startsWith('/webhooks/')) {
    return next();
  }

  const cookieCsrf = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
  const headerCsrf = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!cookieCsrf || !headerCsrf || cookieCsrf !== headerCsrf) {
    return res.status(403).json({ error: 'Forbidden: Invalid or missing CSRF token' });
  }

  next();
}


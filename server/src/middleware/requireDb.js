import { dbReady } from '../db.js';

export const requireDb = (req, res, next) => {
  if (!dbReady()) {
    return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'This feature is temporarily unavailable. Please try again shortly.' } });
  }
  return next();
};

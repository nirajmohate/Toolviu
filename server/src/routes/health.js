import { Router } from 'express';
import { dbReady } from '../db.js';

export const healthRouter = Router();

healthRouter.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'ok', db: dbReady() ? 'up' : 'down', uptime: Math.round(process.uptime()) });
});

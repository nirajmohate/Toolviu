import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { ToolStat } from '../models/ToolStat.js';
import { limiter } from '../middleware/rateLimit.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import { TOOL_SLUGS } from '../utils/tools.js';

export const statsRouter = Router();

const viewSchema = z.object({ tool: z.enum(TOOL_SLUGS) });

statsRouter.post(
  '/stats/view',
  limiter({ windowMs: 60_000, limit: config.rateLimits.statsPerMinute }),
  validate(viewSchema),
  requireDb,
  async (req, res) => {
    const day = new Date().toISOString().slice(0, 10);
    await ToolStat.updateOne(
      { tool: req.valid.body.tool, day },
      { $inc: { views: 1 }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    res.status(204).end();
  },
);

// Small in-memory cache so the homepage never hits the database on every request.
let cache = { at: 0, key: '', value: null };

statsRouter.get('/stats/popular', requireDb, async (req, res) => {
  const days = Math.min(Math.max(Number.parseInt(req.query.days, 10) || 30, 1), 90);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 24);
  const key = `${days}:${limit}`;

  res.set('Cache-Control', 'public, max-age=300');
  if (cache.value && cache.key === key && Date.now() - cache.at < 5 * 60_000) {
    return res.json(cache.value);
  }

  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const rows = await ToolStat.aggregate([
    { $match: { day: { $gte: since } } },
    { $group: { _id: '$tool', views: { $sum: '$views' } } },
    { $sort: { views: -1 } },
    { $limit: limit },
  ]);
  const value = { days, tools: rows.map((r) => ({ tool: r._id, views: r.views })) };
  cache = { at: Date.now(), key, value };
  return res.json(value);
});

import { Router } from 'express';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import { config } from '../config.js';
import { Snippet } from '../models/Snippet.js';
import { limiter } from '../middleware/rateLimit.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import { SHAREABLE_TOOLS } from '../utils/tools.js';

export const shareRouter = Router();

// No look-alike characters (0/o, 1/l/i).
const makeId = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 9);
const ID_PATTERN = /^[2-9a-hj-km-np-z]{9}$/;

const createSchema = z.object({
  tool: z.enum(SHAREABLE_TOOLS),
  data: z.string().min(1).max(config.snippetMaxChars),
});

shareRouter.post(
  '/share',
  limiter({ windowMs: 60 * 60_000, limit: config.rateLimits.sharePerHour, message: 'Share limit reached. Try again later.' }),
  validate(createSchema),
  requireDb,
  async (req, res) => {
    const { tool, data } = req.valid.body;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const doc = await Snippet.create({ _id: makeId(), tool, data });
        res.set('Cache-Control', 'no-store');
        return res.status(201).json({ id: doc._id, expiresInDays: config.snippetTtlDays });
      } catch (err) {
        if (err && err.code === 11000) continue; // id collision, try another
        throw err;
      }
    }
    return res.status(500).json({ error: { code: 'ID_GENERATION_FAILED', message: 'Could not create a share link. Please try again.' } });
  },
);

shareRouter.get('/share/:id', requireDb, async (req, res) => {
  const { id } = req.params;
  if (!ID_PATTERN.test(id)) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'This share link does not exist or has expired.' } });
  }
  const doc = await Snippet.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true }).lean();
  if (!doc) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'This share link does not exist or has expired.' } });
  }
  res.set('Cache-Control', 'no-store');
  return res.json({ id: doc._id, tool: doc.tool, data: doc.data, createdAt: doc.createdAt });
});

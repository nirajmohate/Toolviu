import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { dbReady } from '../db.js';
import { Feedback } from '../models/Feedback.js';
import { limiter } from '../middleware/rateLimit.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';

export const feedbackRouter = Router();

const schema = z.object({
  type: z.enum(['bug', 'idea', 'other']).default('other'),
  message: z.string().trim().min(5, 'Please write at least a few words').max(2000),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  page: z.string().max(300).optional(),
  website: z.string().max(200).optional(), // honeypot: real users never fill this in
});

feedbackRouter.post(
  '/feedback',
  limiter({ windowMs: 60 * 60_000, limit: config.rateLimits.feedbackPerHour, message: 'You have sent several messages already. Please try again later.' }),
  validate(schema),
  async (req, res) => {
    const { website, email, ...rest } = req.valid.body;
    if (website) return res.status(201).json({ ok: true }); // silently drop bot submissions
    if (!dbReady()) {
      return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Could not save your message right now. Please try again shortly.' } });
    }
    await Feedback.create({ ...rest, email: email || undefined, userAgent: String(req.get('user-agent') || '').slice(0, 300) });
    return res.status(201).json({ ok: true });
  },
);

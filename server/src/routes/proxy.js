import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { limiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { proxyRequest } from '../utils/proxyRequest.js';
import { ProxyError } from '../utils/ssrf.js';

export const proxyRouter = Router();

const schema = z.object({
  url: z.string().trim().min(1).max(2048),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).default('GET'),
  headers: z.record(z.string().max(200), z.string().max(4000)).default({}).refine((h) => Object.keys(h).length <= 40, 'Too many headers (max 40)'),
  body: z.string().max(1_000_000).optional(),
  followRedirects: z.boolean().default(true),
});

proxyRouter.post(
  '/proxy',
  limiter({
    windowMs: 60_000,
    limit: config.rateLimits.proxyPerMinute,
    message: 'You are sending requests too quickly. Wait a moment and try again.',
  }),
  validate(schema),
  async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const result = await proxyRequest(req.valid.body, {
        timeoutMs: config.proxy.timeoutMs,
        maxBytes: config.proxy.maxResponseBytes,
        maxRedirects: config.proxy.maxRedirects,
        allowPrivate: config.proxy.allowPrivateTargets,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      if (err instanceof ProxyError) {
        return res.status(err.status).json({ ok: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  },
);

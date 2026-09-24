import rateLimit from 'express-rate-limit';

export const limiter = ({ windowMs, limit, message }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: message || 'Too many requests. Please slow down and try again shortly.' } },
  });

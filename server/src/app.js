import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config.js';
import { limiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { proxyRouter } from './routes/proxy.js';
import { shareRouter } from './routes/share.js';
import { statsRouter } from './routes/stats.js';
import { feedbackRouter } from './routes/feedback.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin(origin, callback) {
        // Requests without an Origin header (server-to-server, curl, Next.js rewrites) are allowed.
        if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      maxAge: 86_400,
    }),
  );
  app.use(compression());
  if (!config.isTest) app.use(morgan(config.isProd ? 'combined' : 'dev'));
  app.use(express.json({ limit: '1.5mb' }));

  app.use('/api', limiter({ windowMs: 60_000, limit: config.rateLimits.globalPerMinute }));
  app.use('/api', healthRouter);
  app.use('/api', proxyRouter);
  app.use('/api', shareRouter);
  app.use('/api', statsRouter);
  app.use('/api', feedbackRouter);

  app.get('/', (req, res) => res.json({ name: 'toolviu-api', status: 'ok' }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

import 'dotenv/config';

const int = (value, fallback) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

const bool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

// TRUST_PROXY accepts a hop count ("1"), a boolean ("true"), or an Express preset ("loopback").
const parseTrustProxy = (value) => {
  if (value === undefined || value === '') return 1;
  if (/^\d+$/.test(value)) return Number.parseInt(value, 10);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

const env = process.env.NODE_ENV || 'development';

export const config = Object.freeze({
  env,
  isProd: env === 'production',
  isTest: env === 'test',
  port: int(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/toolviu',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),

  snippetTtlDays: int(process.env.SNIPPET_TTL_DAYS, 30),
  snippetMaxChars: int(process.env.SNIPPET_MAX_CHARS, 200_000),

  proxy: Object.freeze({
    timeoutMs: Math.min(int(process.env.PROXY_TIMEOUT_MS, 15_000), 30_000),
    maxResponseBytes: int(process.env.PROXY_MAX_RESPONSE_BYTES, 2 * 1024 * 1024),
    maxRedirects: int(process.env.PROXY_MAX_REDIRECTS, 5),
    // Only for local development. NEVER enable on a public server (SSRF risk).
    allowPrivateTargets: bool(process.env.PROXY_ALLOW_PRIVATE_TARGETS, false),
  }),

  rateLimits: Object.freeze({
    proxyPerMinute: int(process.env.RATE_PROXY_PER_MIN, 30),
    sharePerHour: int(process.env.RATE_SHARE_PER_HOUR, 60),
    feedbackPerHour: int(process.env.RATE_FEEDBACK_PER_HOUR, 5),
    statsPerMinute: int(process.env.RATE_STATS_PER_MIN, 120),
    globalPerMinute: int(process.env.RATE_GLOBAL_PER_MIN, 300),
  }),
});

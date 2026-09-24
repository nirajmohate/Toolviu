import { config } from './config.js';
import { createApp } from './app.js';
import { startDb } from './db.js';

const app = createApp();
const stopDb = startDb(config.mongoUri, console);

const server = app.listen(config.port, () => {
  console.log(`[api] listening on :${config.port} (${config.env})`);
});

// Make sure idle keep-alive connections outlive typical load balancer timeouts.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[api] ${signal} received, shutting down`);
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  server.close(async () => {
    await stopDb();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => console.error('[api] unhandledRejection', reason));

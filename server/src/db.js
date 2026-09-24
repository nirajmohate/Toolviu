import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

export const dbReady = () => mongoose.connection.readyState === 1;

/**
 * Connects in the background and keeps retrying if MongoDB is not reachable yet.
 * The API (including the request proxy) starts serving immediately; database-backed
 * routes answer 503 until the connection is up.
 */
export function startDb(uri, log = console) {
  let stopped = false;
  let timer = null;

  const attempt = async () => {
    if (stopped) return;
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, maxPoolSize: 10 });
      log.info?.('[db] connected');
    } catch (err) {
      log.error?.(`[db] connection failed: ${err.message}. Retrying in 5s`);
      timer = setTimeout(attempt, 5000);
    }
  };

  mongoose.connection.on('disconnected', () => log.warn?.('[db] disconnected'));
  mongoose.connection.on('reconnected', () => log.info?.('[db] reconnected'));
  attempt();

  return async () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    await mongoose.connection.close().catch(() => {});
  };
}

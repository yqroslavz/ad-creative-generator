import type { RedisOptions } from 'ioredis';

export function buildRedisConnectionOptions(): RedisOptions {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is not set');

  const parsed = new URL(url);
  const useTls = parsed.protocol === 'rediss:';

  const options: RedisOptions = {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    keepAlive: 30000,
    family: 0,
  };

  if (useTls) options.tls = { servername: parsed.hostname };

  return options;
}

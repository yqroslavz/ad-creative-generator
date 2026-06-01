import type { RedisOptions } from 'ioredis';

export function buildRedisConnectionOptions(): RedisOptions {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is not set');

  const parsed = new URL(url);
  const useTls = parsed.protocol === 'rediss:';

  const options: RedisOptions = {
    host: parsed.hostname,
    port: Number(parsed.port || (useTls ? 6379 : 6379)),
    username: parsed.username || undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

  if (useTls) options.tls = {};

  return options;
}

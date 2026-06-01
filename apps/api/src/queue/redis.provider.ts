import { Logger, type Provider } from '@nestjs/common';
import IORedis, { type Redis } from 'ioredis';
import { REDIS_CONNECTION } from './queue.constants';
import { buildRedisConnectionOptions } from './redis.connection';

const logger = new Logger('Redis');

export const redisProvider: Provider = {
  provide: REDIS_CONNECTION,
  useFactory: (): Redis => {
    const connection = new IORedis(buildRedisConnectionOptions());
    connection.on('error', (err) => logger.error(err.message));
    connection.on('connect', () => logger.log('Redis connected'));
    return connection;
  },
};

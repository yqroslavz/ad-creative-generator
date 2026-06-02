import { Inject, Injectable, Logger } from '@nestjs/common';
import IORedis, { type Redis } from 'ioredis';
import { Observable } from 'rxjs';
import { buildRedisConnectionOptions } from '../../queue/redis.connection';
import { REDIS_CONNECTION } from '../../queue/queue.constants';

export type GenerationStatusEvent = {
  type: 'STATUS';
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  n?: number;
  textProviderUsed?: string | null;
  imageModeUsed?: string | null;
  error?: string;
};

const channelFor = (requestId: string): string => `generation:${requestId}`;

@Injectable()
export class GenerationEventsService {
  private readonly logger = new Logger(GenerationEventsService.name);

  constructor(@Inject(REDIS_CONNECTION) private readonly publisher: Redis) {}

  async publish(
    requestId: string,
    event: GenerationStatusEvent,
  ): Promise<void> {
    await this.publisher.publish(channelFor(requestId), JSON.stringify(event));
  }

  subscribe(requestId: string): Observable<GenerationStatusEvent> {
    return new Observable<GenerationStatusEvent>((subscriber) => {
      const sub = new IORedis(buildRedisConnectionOptions());
      const channel = channelFor(requestId);

      sub.on('error', (err) => {
        this.logger.warn(`Subscriber error for ${requestId}: ${err.message}`);
      });

      sub.subscribe(channel).catch((err: Error) => {
        subscriber.error(err);
      });

      sub.on('message', (ch, message) => {
        if (ch !== channel) return;
        try {
          const parsed = JSON.parse(message) as GenerationStatusEvent;
          subscriber.next(parsed);
          if (parsed.status === 'SUCCEEDED' || parsed.status === 'FAILED') {
            subscriber.complete();
          }
        } catch (err) {
          this.logger.warn(
            `Bad event on ${channel}: ${(err as Error).message}`,
          );
        }
      });

      return () => {
        void sub.unsubscribe(channel).catch(() => undefined);
        void sub.quit().catch(() => undefined);
      };
    });
  }
}

import { Global, Module } from '@nestjs/common';
import { GenerationQueueService } from './generation-queue.service';
import { redisProvider } from './redis.provider';

@Global()
@Module({
  providers: [redisProvider, GenerationQueueService],
  exports: [redisProvider, GenerationQueueService],
})
export class QueueModule {}

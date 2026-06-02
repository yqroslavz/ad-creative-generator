import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, type ConnectionOptions } from 'bullmq';
import {
  GENERATION_QUEUE,
  JOB_GENERATE_TEXT,
  JOB_REGENERATE_IMAGE,
  type GenerationJobData,
} from './queue.constants';
import { buildRedisConnectionOptions } from './redis.connection';

@Injectable()
export class GenerationQueueService implements OnModuleDestroy {
  private readonly queue: Queue<GenerationJobData>;

  constructor() {
    const connection: ConnectionOptions = buildRedisConnectionOptions();
    this.queue = new Queue<GenerationJobData>(GENERATION_QUEUE, {
      connection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { age: 3600, count: 500 },
        removeOnFail: { age: 86400, count: 500 },
      },
    });
  }

  enqueueText(requestId: string): Promise<unknown> {
    return this.queue.add(
      JOB_GENERATE_TEXT,
      { requestId },
      { jobId: requestId },
    );
  }

  enqueueTextRetry(requestId: string): Promise<unknown> {
    return this.queue.add(
      JOB_GENERATE_TEXT,
      { requestId },
      { jobId: `${requestId}:retry:${Date.now()}` },
    );
  }

  enqueueRegenerateImage(creativeId: string): Promise<unknown> {
    return this.queue.add(
      JOB_REGENERATE_IMAGE,
      { creativeId },
      { jobId: `regen:${creativeId}:${Date.now()}` },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}

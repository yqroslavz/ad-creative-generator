import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, type ConnectionOptions } from 'bullmq';
import {
  GENERATION_QUEUE,
  JOB_GENERATE_TEXT,
  type GenerateTextJobData,
} from './queue.constants';
import { buildRedisConnectionOptions } from './redis.connection';

@Injectable()
export class GenerationQueueService implements OnModuleDestroy {
  private readonly queue: Queue<GenerateTextJobData>;

  constructor() {
    const connection: ConnectionOptions = buildRedisConnectionOptions();
    this.queue = new Queue<GenerateTextJobData>(GENERATION_QUEUE, {
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

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}

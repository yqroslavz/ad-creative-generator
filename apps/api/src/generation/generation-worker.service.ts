import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  GENERATION_QUEUE,
  JOB_GENERATE_TEXT,
  type GenerateTextJobData,
} from '../queue/queue.constants';
import { buildRedisConnectionOptions } from '../queue/redis.connection';

@Injectable()
export class GenerationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GenerationWorkerService.name);
  private worker: Worker<GenerateTextJobData> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.worker = new Worker<GenerateTextJobData>(
      GENERATION_QUEUE,
      (job) => this.process(job),
      {
        connection: buildRedisConnectionOptions(),
        concurrency: 2,
      },
    );

    this.worker.on('ready', () => this.logger.log('Generation worker ready'));
    this.worker.on('failed', (job, err) =>
      this.logger.error(`Job ${job?.id ?? '?'} failed: ${err.message}`),
    );
  }

  private async process(job: Job<GenerateTextJobData>): Promise<void> {
    if (job.name !== JOB_GENERATE_TEXT) {
      throw new Error(`Unknown job name: ${job.name}`);
    }

    const { requestId } = job.data;
    await this.prisma.generationRequest.update({
      where: { id: requestId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    try {
      throw new Error('Text generation provider not wired yet');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.generationRequest.update({
        where: { id: requestId },
        data: { status: 'FAILED', error: message, finishedAt: new Date() },
      });
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) await this.worker.close();
  }
}

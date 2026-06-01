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
import { buildPrompt } from './prompts';
import { TextProviderFactory } from './providers/text/text-provider.factory';

@Injectable()
export class GenerationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GenerationWorkerService.name);
  private worker: Worker<GenerateTextJobData> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly textProviders: TextProviderFactory,
  ) {}

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

    const request = await this.prisma.generationRequest.findUnique({
      where: { id: requestId },
      include: { project: true },
    });
    if (!request) throw new Error(`GenerationRequest ${requestId} not found`);

    await this.prisma.generationRequest.update({
      where: { id: requestId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    try {
      const provider = this.textProviders.resolve(request.userId, null);
      const prompt = buildPrompt(request.project.adNetwork, {
        offer: request.project.offerDescription,
        audience: request.project.targetAudience,
        landingPageUrl: request.project.landingPageUrl,
      });

      const creatives = await provider.generate(prompt, request.n);

      await this.prisma.$transaction([
        this.prisma.creative.createMany({
          data: creatives.map((c, idx) => ({
            requestId,
            position: idx,
            headline: c.headline,
            description: c.description,
            cta: c.cta,
          })),
        }),
        this.prisma.generationRequest.update({
          where: { id: requestId },
          data: {
            status: 'SUCCEEDED',
            textProviderUsed: provider.id,
            finishedAt: new Date(),
          },
        }),
      ]);

      this.logger.log(
        `Job ${job.id} succeeded: ${creatives.length} creatives via ${provider.id}`,
      );
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

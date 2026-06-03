import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import type { ImageMode } from '@prisma/client';
import { workerContextStorage } from '../credentials/worker-context';
import { PrismaService } from '../prisma/prisma.service';
import { GenerationEventsService } from './events/generation-events.service';
import {
  GENERATION_QUEUE,
  JOB_GENERATE_TEXT,
  JOB_REGENERATE_IMAGE,
  type GenerateTextJobData,
  type GenerationJobData,
  type RegenerateImageJobData,
} from '../queue/queue.constants';
import { buildRedisConnectionOptions } from '../queue/redis.connection';
import { buildPrompt } from './prompts';
import { ImageStrategyService } from './providers/image/image-strategy.service';
import { TextProviderFactory } from './providers/text/text-provider.factory';
import type { CreativeText } from './providers/text/ai-text-provider.interface';

@Injectable()
export class GenerationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GenerationWorkerService.name);
  private worker: Worker<GenerationJobData> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly textProviders: TextProviderFactory,
    private readonly imageStrategy: ImageStrategyService,
    private readonly events: GenerationEventsService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<GenerationJobData>(
      GENERATION_QUEUE,
      (job) => this.dispatch(job),
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

  private async dispatch(job: Job<GenerationJobData>): Promise<void> {
    if (job.name === JOB_GENERATE_TEXT) {
      const data = job.data as GenerateTextJobData;
      return workerContextStorage.run(
        { jobId: String(job.id ?? ''), requestId: data.requestId },
        () => this.processText(job as Job<GenerateTextJobData>),
      );
    }

    if (job.name === JOB_REGENERATE_IMAGE) {
      const data = job.data as RegenerateImageJobData;
      const creative = await this.prisma.creative.findUnique({
        where: { id: data.creativeId },
        select: { requestId: true },
      });
      if (!creative) {
        throw new Error(`Creative ${data.creativeId} not found`);
      }
      return workerContextStorage.run(
        { jobId: String(job.id ?? ''), requestId: creative.requestId },
        () => this.processRegenerateImage(job as Job<RegenerateImageJobData>),
      );
    }

    throw new Error(`Unknown job name: ${job.name}`);
  }

  private async processText(job: Job<GenerateTextJobData>): Promise<void> {
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
    await this.events.publish(requestId, {
      type: 'STATUS',
      status: 'RUNNING',
      n: request.n,
    });

    try {
      const { provider, wasBYOK } = await this.textProviders.resolve(
        request.userId,
        request.textProviderUsed,
      );
      const prompt = buildPrompt(request.project.adNetwork, {
        offer: request.project.offerDescription,
        audience: request.project.targetAudience,
        landingPageUrl: request.project.landingPageUrl,
      });

      const texts = await provider.generate(prompt, request.n);

      const useByokDalle = request.imageModeUsed === 'BYOK_DALLE';

      const imageResults: Awaited<
        ReturnType<typeof this.generateImageSafely>
      >[] = [];
      for (const [idx, text] of texts.entries()) {
        imageResults.push(
          await this.generateImageSafely(
            requestId,
            idx,
            text,
            request.project.adNetwork,
            request.userId,
            useByokDalle,
          ),
        );
      }

      const successfulMode = imageResults.find((r) => r !== null)?.mode ?? null;

      await this.prisma.$transaction([
        this.prisma.creative.createMany({
          data: texts.map((c, idx) => ({
            requestId,
            position: idx,
            headline: c.headline,
            description: c.description,
            cta: c.cta,
            imageUrl: imageResults[idx]?.url ?? null,
            imagePromptUsed: imageResults[idx]?.promptUsed ?? null,
          })),
        }),
        this.prisma.generationRequest.update({
          where: { id: requestId },
          data: {
            status: 'SUCCEEDED',
            textProviderUsed: provider.id,
            textWasBYOK: wasBYOK,
            imageModeUsed: successfulMode,
            finishedAt: new Date(),
          },
        }),
      ]);

      this.logger.log(
        `Job ${job.id} succeeded: ${texts.length} creatives, text=${provider.id}${wasBYOK ? ' (BYOK)' : ''}, image=${successfulMode ?? 'NONE'}`,
      );
      await this.events.publish(requestId, {
        type: 'STATUS',
        status: 'SUCCEEDED',
        n: texts.length,
        textProviderUsed: provider.id,
        imageModeUsed: successfulMode,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.generationRequest.update({
        where: { id: requestId },
        data: { status: 'FAILED', error: message, finishedAt: new Date() },
      });
      await this.events.publish(requestId, {
        type: 'STATUS',
        status: 'FAILED',
        error: message,
      });
      throw err;
    }
  }

  private async processRegenerateImage(
    job: Job<RegenerateImageJobData>,
  ): Promise<void> {
    const { creativeId } = job.data;

    const creative = await this.prisma.creative.findUnique({
      where: { id: creativeId },
      include: { request: { include: { project: true } } },
    });
    if (!creative) throw new Error(`Creative ${creativeId} not found`);

    const { request } = creative;
    const useByokDalle = request.imageModeUsed === 'BYOK_DALLE';

    try {
      const result = await this.imageStrategy.generateAndUpload(
        request.id,
        creative.position,
        {
          headline: creative.headline,
          description: creative.description,
          cta: creative.cta,
          network: request.project.adNetwork,
          userId: request.userId,
        },
        useByokDalle,
      );

      await this.prisma.creative.update({
        where: { id: creativeId },
        data: { imageUrl: result.url, imagePromptUsed: result.promptUsed },
      });

      this.logger.log(
        `Regenerated image for creative ${creativeId} (mode=${result.mode})`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Image regeneration failed for creative ${creativeId}: ${message}`,
      );
      throw err;
    }
  }

  private async generateImageSafely(
    requestId: string,
    idx: number,
    text: CreativeText,
    network: GenerateImageInput['network'],
    userId: string,
    useByokDalle: boolean,
  ): Promise<{ url: string; mode: ImageMode; promptUsed: string } | null> {
    try {
      return await this.imageStrategy.generateAndUpload(
        requestId,
        idx,
        {
          headline: text.headline,
          description: text.description,
          cta: text.cta,
          network,
          userId,
        },
        useByokDalle,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Image gen failed for ${requestId}#${idx}: ${message}`);
      return null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) await this.worker.close();
  }
}

type GenerateImageInput = Parameters<
  ImageStrategyService['generateAndUpload']
>[2];

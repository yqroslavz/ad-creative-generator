import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Creative, GenerationRequest } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GenerationQueueService } from '../queue/generation-queue.service';
import type { GenerateCreativesInput } from './generation.types';

const MIN_N = 1;
const MAX_N = 10;

@Injectable()
export class GenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: GenerationQueueService,
  ) {}

  async create(
    userId: string,
    input: GenerateCreativesInput,
  ): Promise<GenerationRequest> {
    if (!Number.isInteger(input.n) || input.n < MIN_N || input.n > MAX_N) {
      throw new BadRequestException(
        `n must be an integer in [${MIN_N}, ${MAX_N}]`,
      );
    }

    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId, userId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const request = await this.prisma.generationRequest.create({
      data: {
        projectId: input.projectId,
        userId,
        n: input.n,
        textProviderUsed: input.textProvider ?? null,
      },
    });

    await this.queue.enqueueText(request.id);
    return request;
  }

  listByUser(
    userId: string,
    projectId?: string | null,
  ): Promise<GenerationRequest[]> {
    return this.prisma.generationRequest.findMany({
      where: { userId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findOne(userId: string, id: string): Promise<GenerationRequest | null> {
    return this.prisma.generationRequest.findFirst({
      where: { id, userId },
    });
  }

  creativesFor(requestId: string): Promise<Creative[]> {
    return this.prisma.creative.findMany({
      where: { requestId },
      orderBy: { position: 'asc' },
    });
  }
}

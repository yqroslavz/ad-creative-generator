import { Injectable, NotFoundException } from '@nestjs/common';
import type { Project } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProjectInput, UpdateProjectInput } from './projects.types';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string): Promise<Project | null> {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
    });
    return project;
  }

  create(userId: string, input: CreateProjectInput): Promise<Project> {
    return this.prisma.project.create({
      data: {
        userId,
        name: input.name,
        offerDescription: input.offerDescription,
        targetAudience: input.targetAudience,
        adNetwork: input.adNetwork,
        landingPageUrl: input.landingPageUrl ?? null,
      },
    });
  }

  async update(
    userId: string,
    id: string,
    input: UpdateProjectInput,
  ): Promise<Project> {
    const owned = await this.prisma.project.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException('Project not found');

    const data: Record<string, unknown> = {};
    if (input.name != null) data.name = input.name;
    if (input.offerDescription != null)
      data.offerDescription = input.offerDescription;
    if (input.targetAudience != null)
      data.targetAudience = input.targetAudience;
    if (input.adNetwork != null) data.adNetwork = input.adNetwork;
    if (input.landingPageUrl !== undefined)
      data.landingPageUrl = input.landingPageUrl;

    return this.prisma.project.update({ where: { id }, data });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.prisma.project.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  }
}

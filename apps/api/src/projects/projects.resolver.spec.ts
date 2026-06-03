import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsResolver } from './projects.resolver';
import { ProjectsService } from './projects.service';

type MockedProject = {
  findMany: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  deleteMany: jest.Mock;
};

function makePrismaMock(): { project: MockedProject } {
  return {
    project: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

const user: AuthUser = {
  userId: 'user_a',
  clerkId: 'clerk_a',
  email: 'a@example.com',
};
const otherUser: AuthUser = {
  userId: 'user_b',
  clerkId: 'clerk_b',
  email: 'b@example.com',
};

async function buildResolver(): Promise<{
  resolver: ProjectsResolver;
  prisma: { project: MockedProject };
}> {
  const prisma = makePrismaMock();
  const mod = await Test.createTestingModule({
    providers: [
      ProjectsResolver,
      ProjectsService,
      { provide: PrismaService, useValue: prisma },
    ],
  }).compile();
  return { resolver: mod.get(ProjectsResolver), prisma };
}

describe('ProjectsResolver', () => {
  it('list scopes findMany to the caller userId', async () => {
    const { resolver, prisma } = await buildResolver();
    prisma.project.findMany.mockResolvedValue([]);

    await resolver.list(user);

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('findOne uses ownership-scoped findFirst', async () => {
    const { resolver, prisma } = await buildResolver();
    prisma.project.findFirst.mockResolvedValue(null);

    const out = await resolver.findOne(user, 'project_1');

    expect(out).toBeNull();
    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'project_1', userId: user.userId },
    });
  });

  it('create persists userId from the resolver context, not the input', async () => {
    const { resolver, prisma } = await buildResolver();
    prisma.project.create.mockImplementation(
      (args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'new', ...args.data }),
    );

    await resolver.create(user, {
      name: 'Ring promo',
      offerDescription: 'sleep ring',
      targetAudience: 'insomniacs 30-55',
      adNetwork: 'TABOOLA',
    });

    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: user.userId,
          landingPageUrl: null,
        }),
      }),
    );
  });

  it('update refuses to touch a project owned by another user', async () => {
    const { resolver, prisma } = await buildResolver();
    prisma.project.findFirst.mockResolvedValue(null);

    await expect(
      resolver.update(otherUser, 'project_owned_by_a', { name: 'hijack' }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it('update applies only the provided fields', async () => {
    const { resolver, prisma } = await buildResolver();
    prisma.project.findFirst.mockResolvedValue({ id: 'project_1' });
    prisma.project.update.mockResolvedValue({ id: 'project_1' });

    await resolver.update(user, 'project_1', { name: 'renamed' });

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'project_1' },
      data: { name: 'renamed' },
    });
  });

  it('delete returns true only when a row was removed and is userId-scoped', async () => {
    const { resolver, prisma } = await buildResolver();
    prisma.project.deleteMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await expect(resolver.delete(user, 'project_1')).resolves.toBe(true);
    await expect(resolver.delete(user, 'project_2')).resolves.toBe(false);

    expect(prisma.project.deleteMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'project_1', userId: user.userId },
    });
  });
});

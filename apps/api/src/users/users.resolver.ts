import { Query, Resolver } from '@nestjs/graphql';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { GqlContext } from '../auth/auth.types';
import { Context } from '@nestjs/graphql';

@Resolver('User')
export class UsersResolver {
  constructor(private readonly prisma: PrismaService) {}

  @Query('me')
  async me(@Context() ctx: GqlContext): Promise<User | null> {
    if (!ctx.user) return null;
    return this.prisma.user.findUnique({ where: { id: ctx.user.userId } });
  }
}

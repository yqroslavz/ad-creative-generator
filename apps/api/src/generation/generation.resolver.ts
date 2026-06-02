import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import type { Creative, GenerationRequest } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { GenerationService } from './generation.service';
import { GenerationThrottleGuard } from './generation-throttle.guard';
import type { GenerateCreativesInput } from './generation.types';

@Resolver('GenerationRequest')
@UseGuards(GqlAuthGuard)
export class GenerationResolver {
  constructor(private readonly generation: GenerationService) {}

  @Query('myGenerations')
  myGenerations(
    @CurrentUser() user: AuthUser,
    @Args('projectId') projectId?: string | null,
  ): Promise<GenerationRequest[]> {
    return this.generation.listByUser(user.userId, projectId);
  }

  @Query('generationRequest')
  findOne(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<GenerationRequest | null> {
    return this.generation.findOne(user.userId, id);
  }

  @Mutation('generateCreatives')
  @UseGuards(GenerationThrottleGuard)
  create(
    @CurrentUser() user: AuthUser,
    @Args('input') input: GenerateCreativesInput,
  ): Promise<GenerationRequest> {
    return this.generation.create(user.userId, input);
  }

  @Mutation('regenerateCreative')
  regenerateCreative(
    @CurrentUser() user: AuthUser,
    @Args('creativeId') creativeId: string,
  ): Promise<Creative> {
    return this.generation.regenerateCreative(user.userId, creativeId);
  }

  @Mutation('retryGeneration')
  @UseGuards(GenerationThrottleGuard)
  retryGeneration(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<GenerationRequest> {
    return this.generation.retryGeneration(user.userId, id);
  }

  @ResolveField('creatives')
  creatives(@Parent() request: GenerationRequest): Promise<Creative[]> {
    return this.generation.creativesFor(request.id);
  }
}

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { Project } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { ProjectsService } from './projects.service';
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from './projects.types';

@Resolver('Project')
@UseGuards(GqlAuthGuard)
export class ProjectsResolver {
  constructor(private readonly projects: ProjectsService) {}

  @Query('projects')
  list(@CurrentUser() user: AuthUser): Promise<Project[]> {
    return this.projects.list(user.userId);
  }

  @Query('project')
  findOne(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<Project | null> {
    return this.projects.findOne(user.userId, id);
  }

  @Mutation('createProject')
  create(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateProjectInput,
  ): Promise<Project> {
    return this.projects.create(user.userId, input);
  }

  @Mutation('updateProject')
  update(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('input') input: UpdateProjectInput,
  ): Promise<Project> {
    return this.projects.update(user.userId, id, input);
  }

  @Mutation('deleteProject')
  delete(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<boolean> {
    return this.projects.delete(user.userId, id);
  }
}

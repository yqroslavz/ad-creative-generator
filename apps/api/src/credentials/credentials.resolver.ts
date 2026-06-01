import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { TextProvider } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CredentialsService } from './credentials.service';
import type { SaveApiKeyInput, UserApiKeyPreview } from './credentials.types';

@Resolver('UserApiKeyPreview')
@UseGuards(GqlAuthGuard)
export class CredentialsResolver {
  constructor(private readonly credentials: CredentialsService) {}

  @Query('myApiKeys')
  myApiKeys(@CurrentUser() user: AuthUser): Promise<UserApiKeyPreview[]> {
    return this.credentials.list(user.userId);
  }

  @Mutation('saveApiKey')
  save(
    @CurrentUser() user: AuthUser,
    @Args('input') input: SaveApiKeyInput,
  ): Promise<UserApiKeyPreview> {
    return this.credentials.save(user.userId, input);
  }

  @Mutation('deleteApiKey')
  remove(
    @CurrentUser() user: AuthUser,
    @Args('provider') provider: TextProvider,
  ): Promise<boolean> {
    return this.credentials.delete(user.userId, provider);
  }
}

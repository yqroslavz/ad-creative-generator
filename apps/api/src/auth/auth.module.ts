import { Global, Module } from '@nestjs/common';
import { ClerkAuthService } from './clerk-auth.service';
import { GqlAuthGuard } from './gql-auth.guard';

@Global()
@Module({
  providers: [ClerkAuthService, GqlAuthGuard],
  exports: [ClerkAuthService, GqlAuthGuard],
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { CredentialsResolver } from './credentials.resolver';
import { CredentialsService } from './credentials.service';

@Module({
  providers: [CredentialsService, CredentialsResolver],
  exports: [CredentialsService],
})
export class CredentialsModule {}

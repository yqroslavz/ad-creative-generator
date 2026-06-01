import { Module } from '@nestjs/common';
import { CredentialsModule } from '../credentials/credentials.module';
import { StorageModule } from '../storage/storage.module';
import { GenerationWorkerService } from './generation-worker.service';
import { GenerationResolver } from './generation.resolver';
import { GenerationService } from './generation.service';
import { GenerationThrottleGuard } from './generation-throttle.guard';
import { RateLimitService } from './rate-limit.service';
import { DalleProvider } from './providers/image/dalle.provider';
import { ImageStrategyService } from './providers/image/image-strategy.service';
import { PollinationsProvider } from './providers/image/pollinations.provider';
import { SvgFallbackProvider } from './providers/image/svg-fallback.provider';
import { TextProviderFactory } from './providers/text/text-provider.factory';

@Module({
  imports: [StorageModule, CredentialsModule],
  providers: [
    GenerationWorkerService,
    GenerationService,
    GenerationResolver,
    GenerationThrottleGuard,
    RateLimitService,
    TextProviderFactory,
    PollinationsProvider,
    SvgFallbackProvider,
    DalleProvider,
    ImageStrategyService,
  ],
  exports: [GenerationWorkerService, TextProviderFactory],
})
export class GenerationModule {}

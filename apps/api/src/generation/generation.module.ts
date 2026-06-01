import { Module } from '@nestjs/common';
import { GenerationWorkerService } from './generation-worker.service';
import { GenerationResolver } from './generation.resolver';
import { GenerationService } from './generation.service';
import { GenerationThrottleGuard } from './generation-throttle.guard';
import { RateLimitService } from './rate-limit.service';
import { TextProviderFactory } from './providers/text/text-provider.factory';

@Module({
  providers: [
    GenerationWorkerService,
    GenerationService,
    GenerationResolver,
    GenerationThrottleGuard,
    RateLimitService,
    TextProviderFactory,
  ],
  exports: [GenerationWorkerService, TextProviderFactory],
})
export class GenerationModule {}

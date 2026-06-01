import { Module } from '@nestjs/common';
import { GenerationWorkerService } from './generation-worker.service';

@Module({
  providers: [GenerationWorkerService],
  exports: [GenerationWorkerService],
})
export class GenerationModule {}

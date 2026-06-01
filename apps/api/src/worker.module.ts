import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GenerationModule } from './generation/generation.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    QueueModule,
    GenerationModule,
  ],
})
export class WorkerModule {}

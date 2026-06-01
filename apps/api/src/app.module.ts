import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AuthModule } from './auth/auth.module';
import { GenerationModule } from './generation/generation.module';
import { GraphqlModule } from './graphql/graphql.module';
import { ProjectsModule } from './projects/projects.module';
import { QueueModule } from './queue/queue.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    QueueModule,
    AuthModule,
    GraphqlModule,
    UsersModule,
    ProjectsModule,
    GenerationModule,
    HealthModule,
    WebhooksModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { join } from 'node:path';
import type { Request } from 'express';
import { ClerkAuthService } from '../auth/clerk-auth.service';
import type { GqlContext } from '../auth/auth.types';
import { DateTimeScalar } from './datetime.scalar';

@Module({
  imports: [
    NestGraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ClerkAuthService],
      useFactory: (clerkAuth: ClerkAuthService) => {
        const isProd = process.env.NODE_ENV === 'production';
        return {
          typePaths: [join(__dirname, '..', '**/*.graphql')],
          playground: false,
          introspection: !isProd,
          plugins: isProd
            ? []
            : [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
          cors: false,
          context: async ({ req }: { req: Request }): Promise<GqlContext> => {
            const authHeader = req.headers.authorization;
            const user = await clerkAuth.resolveUserFromHeader(authHeader);
            const forwarded = req.headers['x-forwarded-for'];
            const forwardedFirst = Array.isArray(forwarded)
              ? forwarded[0]
              : forwarded?.split(',')[0];
            const ip = forwardedFirst?.trim() || req.ip || null;
            return { user, ip };
          },
        };
      },
    }),
  ],
  providers: [DateTimeScalar],
})
export class GraphqlModule {}

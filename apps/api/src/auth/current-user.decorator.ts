import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { AuthUser, GqlContext } from './auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const ctx = GqlExecutionContext.create(context).getContext<GqlContext>();
    if (!ctx.user) throw new Error('CurrentUser used without GqlAuthGuard');
    return ctx.user;
  },
);

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { GqlContext } from '../auth/auth.types';
import { RateLimitService } from './rate-limit.service';

const USER_LIMIT = 10;
const USER_WINDOW_SECONDS = 3600;
const IP_LIMIT = 3;
const IP_WINDOW_SECONDS = 86400;

@Injectable()
export class GenerationThrottleGuard implements CanActivate {
  constructor(private readonly rateLimit: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context).getContext<GqlContext>();
    if (!ctx.user) return true;

    if (ctx.ip) {
      const ipResult = await this.rateLimit.hit(
        `rl:gen:ip:${ctx.ip}`,
        IP_LIMIT,
        IP_WINDOW_SECONDS,
      );
      if (!ipResult.allowed) {
        throw new HttpException(
          `IP rate limit exceeded. Try again in ${ipResult.resetSeconds}s.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const userResult = await this.rateLimit.hit(
      `rl:gen:user:${ctx.user.userId}`,
      USER_LIMIT,
      USER_WINDOW_SECONDS,
    );
    if (!userResult.allowed) {
      throw new HttpException(
        `Hourly limit reached (${USER_LIMIT}/h). Try again in ${userResult.resetSeconds}s.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

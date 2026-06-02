import {
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Query,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable, concat, from, interval, map, of, takeWhile } from 'rxjs';
import { ClerkAuthService } from '../../auth/clerk-auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GenerationEventsService,
  type GenerationStatusEvent,
} from './generation-events.service';

interface SseMessage {
  data: GenerationStatusEvent | { type: 'PING' };
}

const HEARTBEAT_MS = 15_000;

@Controller('sse/generation')
export class GenerationSseController {
  constructor(
    private readonly auth: ClerkAuthService,
    private readonly prisma: PrismaService,
    private readonly events: GenerationEventsService,
  ) {}

  @Sse(':id')
  async stream(
    @Param('id') id: string,
    @Query('token') token?: string,
  ): Promise<Observable<SseMessage>> {
    if (!token) throw new UnauthorizedException('token query param required');

    const user = await this.auth.resolveUserFromHeader(`Bearer ${token}`);
    if (!user) throw new UnauthorizedException('Invalid token');

    const request = await this.prisma.generationRequest.findUnique({
      where: { id },
      select: {
        userId: true,
        status: true,
        n: true,
        textProviderUsed: true,
        imageModeUsed: true,
        error: true,
      },
    });
    if (!request) throw new NotFoundException('Generation not found');
    if (request.userId !== user.userId) {
      throw new ForbiddenException('Not your generation');
    }

    if (request.status === 'SUCCEEDED' || request.status === 'FAILED') {
      const terminal: GenerationStatusEvent = {
        type: 'STATUS',
        status: request.status,
        n: request.n,
        textProviderUsed: request.textProviderUsed,
        imageModeUsed: request.imageModeUsed,
        error: request.error ?? undefined,
      };
      return from([{ data: terminal }]);
    }

    const live$ = this.events
      .subscribe(id)
      .pipe(map((event): SseMessage => ({ data: event })));

    const heartbeat$ = interval(HEARTBEAT_MS).pipe(
      map((): SseMessage => ({ data: { type: 'PING' } })),
    );

    const initial: SseMessage = {
      data: {
        type: 'STATUS',
        status: request.status === 'PENDING' ? 'RUNNING' : request.status,
        n: request.n,
      },
    };

    const merged$ = new Observable<SseMessage>((subscriber) => {
      const liveSub = live$.subscribe({
        next: (v) => subscriber.next(v),
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete(),
      });
      const heartbeatSub = heartbeat$.subscribe((v) => subscriber.next(v));
      return () => {
        liveSub.unsubscribe();
        heartbeatSub.unsubscribe();
      };
    });

    return concat(of(initial), merged$).pipe(
      takeWhile(
        (msg) =>
          msg.data.type !== 'STATUS' ||
          (msg.data.status !== 'SUCCEEDED' && msg.data.status !== 'FAILED'),
        true,
      ),
    );
  }
}

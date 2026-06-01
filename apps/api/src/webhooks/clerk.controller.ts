import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';
import { PrismaService } from '../prisma/prisma.service';

type ClerkEmailAddress = { id: string; email_address: string };

type ClerkUserData = {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
};

type ClerkDeletedData = { id: string };

type RawClerkEvent = { type: string; data: unknown };

@Controller('webhooks/clerk')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<{ rawBody?: Buffer }>,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ): Promise<{ received: true }> {
    const secret = this.config.get<string>('CLERK_WEBHOOK_SECRET');
    if (!secret)
      throw new UnauthorizedException('Webhook secret not configured');
    if (!req.rawBody) throw new BadRequestException('Raw body missing');
    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException('Missing Svix headers');
    }

    let event: RawClerkEvent;
    try {
      event = new Webhook(secret).verify(req.rawBody.toString('utf8'), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as RawClerkEvent;
    } catch {
      throw new UnauthorizedException('Invalid signature');
    }

    if (event.type === 'user.created' || event.type === 'user.updated') {
      await this.upsertUser(event.data as ClerkUserData);
    } else if (event.type === 'user.deleted') {
      const { id } = event.data as ClerkDeletedData;
      await this.prisma.user.deleteMany({ where: { clerkId: id } });
    } else {
      this.logger.log(`Ignoring Clerk event: ${event.type}`);
    }

    return { received: true };
  }

  private async upsertUser(data: ClerkUserData): Promise<void> {
    const primary = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id,
    );
    const email =
      primary?.email_address ?? data.email_addresses[0]?.email_address;
    if (!email) throw new BadRequestException('User has no email');

    const name =
      [data.first_name, data.last_name].filter(Boolean).join(' ') || null;

    await this.prisma.user.upsert({
      where: { clerkId: data.id },
      create: { clerkId: data.id, email, name },
      update: { email, name },
    });
  }
}

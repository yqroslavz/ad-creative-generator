import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  NotFoundException,
  Param,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ClerkAuthService } from '../../auth/clerk-auth.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('export/generation')
export class GenerationExportController {
  constructor(
    private readonly auth: ClerkAuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':id.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(
    @Param('id') id: string,
    @Query('token') token: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (!token) throw new UnauthorizedException('token query param required');
    const user = await this.auth.resolveUserFromHeader(`Bearer ${token}`);
    if (!user) throw new UnauthorizedException('Invalid token');

    const request = await this.prisma.generationRequest.findUnique({
      where: { id },
      include: {
        creatives: { orderBy: { position: 'asc' } },
        project: { select: { name: true, adNetwork: true } },
      },
    });
    if (!request) throw new NotFoundException('Generation not found');
    if (request.userId !== user.userId) {
      throw new ForbiddenException('Not your generation');
    }

    const header = [
      'position',
      'headline',
      'description',
      'cta',
      'imageUrl',
      'imageMode',
      'textProvider',
      'project',
      'network',
    ];
    const rows = request.creatives.map((c) =>
      [
        String(c.position),
        c.headline,
        c.description,
        c.cta,
        c.imageUrl ?? '',
        request.imageModeUsed ?? '',
        request.textProviderUsed ?? '',
        request.project.name,
        request.project.adNetwork,
      ]
        .map(csvEscape)
        .join(','),
    );
    const body = [header.join(','), ...rows].join('\r\n');

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="generation-${id}.csv"`,
    );
    res.send(body);
  }
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

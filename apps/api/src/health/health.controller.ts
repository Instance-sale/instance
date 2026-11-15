import { Controller, Get, Logger, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    let dbStatus = 'disconnected';
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (error) {
      this.logger.error('Health check DB error:', error);
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      service: '@instance/api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  }
}

import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CronService } from './cron.service';
import { Public } from '../common/decorators/public.decorator';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';

@Controller('cron')
@UseGuards(InternalSecretGuard)
export class CronController {
  constructor(private readonly cronService: CronService) {}

  @Public()
  @Get('reset-counters')
  async resetCountersGet(@Query('type') type: string) {
    const resetType = type || 'hourly';
    let count = 0;

    if (resetType === 'daily') {
      await this.cronService.handleHourlyCountersReset();
      count = await this.cronService.handleDailyCountersReset();
    } else {
      count = await this.cronService.handleHourlyCountersReset();
    }

    return {
      success: true,
      type: resetType,
      accountsUpdated: count,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('reset-counters')
  async resetCountersPost(@Query('type') type: string) {
    return this.resetCountersGet(type);
  }

  @Public()
  @Get('lead-retention')
  async leadRetentionGet() {
    const result = await this.cronService.handleLeadRetentionCleanup();
    return {
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('lead-retention')
  async leadRetentionPost() {
    return this.leadRetentionGet();
  }
}

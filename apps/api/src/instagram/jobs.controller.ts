import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { InstagramService } from './instagram.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RetryJobsDto, FailedJobsQueryDto } from './dto/instagram.dto';

@Controller(['jobs', 'instagram/jobs'])
export class BackgroundJobsController {
  constructor(private readonly instagramService: InstagramService) {}

  @Get('failed')
  async getFailedJobs(
    @CurrentUser() user: any,
    @Query() query: FailedJobsQueryDto,
  ) {
    const companyId =
      user?.companyId || user?.company?.id || user?.ownedCompanies?.[0]?.id;
    if (!companyId) {
      throw new UnauthorizedException('Company required');
    }
    return this.instagramService.getFailedBackgroundJobs(
      companyId,
      Number(query?.limit) || 50,
      Number(query?.offset) || 0,
    );
  }

  @Post('retry')
  @Roles('OWNER')
  async retryFailedJobs(
    @CurrentUser() user: any,
    @Body() dto: RetryJobsDto,
  ) {
    const companyId =
      user?.companyId || user?.company?.id || user?.ownedCompanies?.[0]?.id;
    if (!companyId) {
      throw new UnauthorizedException('Company required');
    }
    return this.instagramService.retryFailedBackgroundJobs(
      companyId,
      dto?.jobIds,
    );
  }
}

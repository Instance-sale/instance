import { Controller, Get, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AnalyticsRequestDto } from './dto/analytics.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  private getCompanyId(user: any): string {
    const companyId = user?.companyId || user?.company?.id || user?.ownedCompanies?.[0]?.id;
    if (!companyId) {
      throw new UnauthorizedException('Company required');
    }
    return companyId;
  }

  @Post()
  async getAllAnalytics(
    @CurrentUser() user: any,
    @Body() body: AnalyticsRequestDto,
  ) {
    return this.analyticsService.getAllData(this.getCompanyId(user), body.timeRange);
  }

  @Post('overview')
  async getOverview(
    @CurrentUser() user: any,
    @Body() body: AnalyticsRequestDto,
  ) {
    return this.analyticsService.getOverview(this.getCompanyId(user), body.timeRange);
  }

  @Post('funnel')
  async getFunnel(
    @CurrentUser() user: any,
    @Body() body: AnalyticsRequestDto,
  ) {
    return this.analyticsService.getFunnel(this.getCompanyId(user), body.timeRange);
  }

  @Post('engagement')
  async getEngagement(
    @CurrentUser() user: any,
    @Body() body: AnalyticsRequestDto,
  ) {
    return this.analyticsService.getEngagement(this.getCompanyId(user), body.timeRange);
  }

  @Post('conversion')
  async getConversion(
    @CurrentUser() user: any,
    @Body() body: AnalyticsRequestDto,
  ) {
    return this.analyticsService.getConversion(this.getCompanyId(user), body.timeRange);
  }

  @Post('automation')
  async getAutomation(
    @CurrentUser() user: any,
    @Body() body: AnalyticsRequestDto,
  ) {
    return this.analyticsService.getAutomation(this.getCompanyId(user), body.timeRange);
  }

  @Post('daily-trends')
  async getDailyTrends(
    @CurrentUser() user: any,
    @Body() body: AnalyticsRequestDto,
  ) {
    return this.analyticsService.getDailyTrends(this.getCompanyId(user), body.timeRange);
  }

  @Get('origin-attribution')
  async getOriginAttribution(@CurrentUser() user: any) {
    return this.analyticsService.getOriginAttributionAnalytics(this.getCompanyId(user));
  }
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    analyticsService = {
      getAllData: vi.fn(),
      getOverview: vi.fn(),
      getFunnel: vi.fn(),
      getEngagement: vi.fn(),
      getConversion: vi.fn(),
      getAutomation: vi.fn(),
      getDailyTrends: vi.fn(),
      getOriginAttributionAnalytics: vi.fn(),
    } as unknown as AnalyticsService;

    controller = new AnalyticsController(analyticsService);
  });

  const validUser = { companyId: 'comp-123' };

  it('throws UnauthorizedException if user has no company', async () => {
    await expect(controller.getAllAnalytics({}, { timeRange: '7d' } as any)).rejects.toThrow(
      new UnauthorizedException('Company required'),
    );
  });

  it('resolves companyId from user.company.id or user.ownedCompanies', async () => {
    const userWithNestedCompany = { company: { id: 'nested-comp-456' } };
    vi.mocked(analyticsService.getAllData).mockResolvedValueOnce({ totalLeads: 10 } as any);

    await controller.getAllAnalytics(userWithNestedCompany, { timeRange: '30d' } as any);

    expect(analyticsService.getAllData).toHaveBeenCalledWith('nested-comp-456', '30d');
  });

  it('calls analyticsService.getAllData on getAllAnalytics', async () => {
    vi.mocked(analyticsService.getAllData).mockResolvedValueOnce({ overview: {} } as any);

    const res = await controller.getAllAnalytics(validUser, { timeRange: '7d' } as any);

    expect(analyticsService.getAllData).toHaveBeenCalledWith('comp-123', '7d');
    expect(res).toEqual({ overview: {} });
  });

  it('calls analyticsService.getOverview on getOverview', async () => {
    vi.mocked(analyticsService.getOverview).mockResolvedValueOnce({ leads: 42 } as any);

    const res = await controller.getOverview(validUser, { timeRange: '30d' } as any);

    expect(analyticsService.getOverview).toHaveBeenCalledWith('comp-123', '30d');
    expect(res).toEqual({ leads: 42 });
  });

  it('calls analyticsService.getOriginAttributionAnalytics on getOriginAttribution', async () => {
    vi.mocked(analyticsService.getOriginAttributionAnalytics).mockResolvedValueOnce([] as any);

    const res = await controller.getOriginAttribution(validUser);

    expect(analyticsService.getOriginAttributionAnalytics).toHaveBeenCalledWith('comp-123');
    expect(res).toEqual([]);
  });
});

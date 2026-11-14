import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { BackgroundJobsController } from './jobs.controller';
import { InstagramService } from './instagram.service';

describe('BackgroundJobsController', () => {
  let controller: BackgroundJobsController;
  let instagramService: InstagramService;

  beforeEach(() => {
    instagramService = {
      getFailedBackgroundJobs: vi.fn(),
      retryFailedBackgroundJobs: vi.fn(),
    } as unknown as InstagramService;

    controller = new BackgroundJobsController(instagramService);
  });

  it('throws UnauthorizedException if user has no company', async () => {
    await expect(controller.getFailedJobs({}, {} as any)).rejects.toThrow(
      new UnauthorizedException('Company required'),
    );
  });

  it('calls instagramService.getFailedBackgroundJobs with companyId', async () => {
    const fakeJobs = [{ id: 'job-1', status: 'FAILED' }];
    vi.mocked(instagramService.getFailedBackgroundJobs).mockResolvedValueOnce(fakeJobs as any);

    const res = await controller.getFailedJobs({ companyId: 'comp-1' }, { limit: 10, offset: 0 });

    expect(instagramService.getFailedBackgroundJobs).toHaveBeenCalledWith('comp-1', 10, 0);
    expect(res).toEqual(fakeJobs);
  });

  it('calls instagramService.retryFailedBackgroundJobs with jobIds', async () => {
    vi.mocked(instagramService.retryFailedBackgroundJobs).mockResolvedValueOnce({ retriedCount: 2 } as any);

    const res = await controller.retryFailedJobs(
      { companyId: 'comp-1' },
      { jobIds: ['job-1', 'job-2'] },
    );

    expect(instagramService.retryFailedBackgroundJobs).toHaveBeenCalledWith('comp-1', ['job-1', 'job-2']);
    expect(res).toEqual({ retriedCount: 2 });
  });
});

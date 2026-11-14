import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstagramAutomationRunnerService } from './services/instagram-automation-runner.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InstagramAutomationRunnerService', () => {
  let service: InstagramAutomationRunnerService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {
      automationExecution: {
        findFirst: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      instagramUserProfile: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      executionStep: {
        create: vi.fn(),
      },
      backgroundJob: {
        create: vi.fn(),
      },
    } as unknown as PrismaService;

    service = new InstagramAutomationRunnerService(prisma);
  });

  describe('resumeWaitingExecution', () => {
    it('returns false when no waiting execution exists for user', async () => {
      vi.mocked(prisma.automationExecution.findFirst).mockResolvedValueOnce(null);

      const res = await service.resumeWaitingExecution(
        { id: 'acc-1' },
        'sender-123',
        'conv-456',
        'Hello there',
      );

      expect(res).toBe(false);
    });

    it('marks execution FAILED when waiting execution has timed out (>24h)', async () => {
      const thirtyHoursAgo = new Date(Date.now() - 30 * 60 * 60 * 1000);
      vi.mocked(prisma.automationExecution.findFirst).mockResolvedValueOnce({
        id: 'exec-timed-out',
        startedAt: thirtyHoursAgo,
        automation: {
          nodes: [],
        },
      } as any);

      const res = await service.resumeWaitingExecution(
        { id: 'acc-1' },
        'sender-123',
        'conv-456',
        'Late reply',
      );

      expect(res).toBe(false);
      expect(prisma.automationExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-timed-out' },
        data: { status: 'FAILED', errorMessage: 'Timed out waiting for reply' },
      });
    });

    it('resumes execution and creates SEND_DM job when next node is a carousel without a message', async () => {
      const carouselCards = [
        {
          id: 'card-1',
          title: 'Offer 1',
          imageUrl: 'https://example.com/1.jpg',
          buttons: [{ type: 'reply', title: 'Option 1' }],
        },
      ];

      vi.mocked(prisma.automationExecution.findFirst).mockResolvedValueOnce({
        id: 'exec-1',
        startedAt: new Date(),
        currentNodeId: 'node-start',
        variables: {},
        automation: {
          id: 'auto-1',
          nodes: [
            {
              nodeId: 'node-start',
              type: 'ACTION_REPLY_DM',
              config: {},
              nextNodeIds: ['node-carousel'],
            },
            {
              nodeId: 'node-carousel',
              type: 'ACTION_REPLY_DM',
              config: {
                message: '',
                messageFormat: 'carousel',
                carouselCards,
              },
              nextNodeIds: [],
            },
          ],
        },
      } as any);

      vi.mocked(prisma.automationExecution.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.backgroundJob.create).mockResolvedValueOnce({} as any);

      const res = await service.resumeWaitingExecution(
        { id: 'acc-1' },
        'sender-123',
        'conv-456',
        'continue',
      );

      expect(res).toBe(true);
      expect(prisma.backgroundJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            jobType: 'SEND_DM',
            payload: expect.objectContaining({
              carouselCards,
            }),
          }),
        }),
      );
    });
  });
});

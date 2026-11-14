import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CrmService } from './crm.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CrmService', () => {
  let service: CrmService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
      },
      instagramAccount: {
        findFirst: vi.fn(),
      },
      instagramUserProfile: {
        findMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      contactCapture: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      userPipelineStage: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      automationExecution: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;

    service = new CrmService(prisma);
  });

  describe('getLeads', () => {
    it('throws BadRequestException if accountId is missing', async () => {
      await expect(
        service.getLeads('u1', 'comp-1', {} as any),
      ).rejects.toThrow(new BadRequestException('Missing accountId parameter'));
    });

    it('throws NotFoundException if Instagram account does not exist or belong to company', async () => {
      vi.mocked(prisma.instagramAccount.findFirst).mockResolvedValueOnce(null);

      await expect(
        service.getLeads('u1', 'comp-1', { accountId: 'acc-999' } as any),
      ).rejects.toThrow(new NotFoundException('Instagram account not found or access denied'));
    });

    it('returns paginated leads with total counts', async () => {
      vi.mocked(prisma.instagramAccount.findFirst).mockResolvedValueOnce({
        id: 'acc-1',
        companyId: 'comp-1',
      } as any);

      const fakeLeads = [
        {
          id: 'lead-1',
          instagramUserId: 'ig-100',
          username: 'john_doe',
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: null,
          tags: ['VIP'],
          status: 'Qualified',
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.instagramUserProfile.findMany).mockResolvedValueOnce(fakeLeads as any);
      vi.mocked(prisma.instagramUserProfile.count).mockResolvedValueOnce(1);
      vi.mocked(prisma.contactCapture.findMany).mockResolvedValueOnce([]);

      const result: any = await service.getLeads('u1', 'comp-1', {
        accountId: 'acc-1',
        page: 1,
        limit: 10,
      } as any);

      expect(result.leads).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.leads[0].username).toBe('john_doe');
    });
  });
});

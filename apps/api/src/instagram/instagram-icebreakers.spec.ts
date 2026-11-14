import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { InstagramIcebreakersService } from './services/instagram-icebreakers.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InstagramIcebreakersService', () => {
  let service: InstagramIcebreakersService;
  let prisma: PrismaService;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    prisma = {
      instagramAccount: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    } as unknown as PrismaService;

    service = new InstagramIcebreakersService(prisma);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws NotFoundException when no instagram account matches', async () => {
    vi.mocked(prisma.instagramAccount.findFirst).mockResolvedValueOnce(null);

    await expect(service.getIcebreakers('comp-1')).rejects.toThrow(
      new NotFoundException('Instagram account not found for this company'),
    );
  });

  it('returns configured icebreakers and queries Meta Graph API', async () => {
    const mockAccount = {
      id: 'acc-1',
      companyId: 'comp-1',
      username: 'shop_handle',
      accessToken: 'test-token',
      icebreakers: [{ question: 'How can I buy?', payload: 'BUY_NOW' }],
    };
    vi.mocked(prisma.instagramAccount.findFirst).mockResolvedValueOnce(mockAccount as any);

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ ice_breakers: [{ question: 'How can I buy?', payload: 'BUY_NOW' }] }],
      }),
    } as any);

    const res = await service.getIcebreakers('comp-1');

    expect(res.account.username).toBe('shop_handle');
    expect(res.icebreakers).toHaveLength(1);
    expect(res.metaSynced).toBe(true);
    expect(res.liveMetaIcebreakers).toHaveLength(1);
  });
});

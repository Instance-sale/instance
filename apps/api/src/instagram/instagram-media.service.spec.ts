import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InstagramMediaService } from './services/instagram-media.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InstagramMediaService', () => {
  let service: InstagramMediaService;
  let prisma: PrismaService;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    prisma = {
      instagramAccount: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      automation: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;

    service = new InstagramMediaService(prisma);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws NotFoundException if Instagram account does not exist or belong to user', async () => {
    vi.mocked(prisma.instagramAccount.findFirst).mockResolvedValueOnce(null);

    await expect(service.getMedia('u1', 'acc-missing')).rejects.toThrow(
      new NotFoundException('Instagram account not found'),
    );
  });

  it('throws UnauthorizedException if account is inactive or token missing', async () => {
    vi.mocked(prisma.instagramAccount.findFirst).mockResolvedValueOnce({
      id: 'acc-1',
      isActive: false,
      accessToken: null,
    } as any);

    await expect(service.getMedia('u1', 'acc-1')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns parsed media list when Graph API returns success', async () => {
    vi.mocked(prisma.instagramAccount.findFirst).mockResolvedValueOnce({
      id: 'acc-1',
      isActive: true,
      accessToken: 'valid-token',
      instagramUserId: 'ig-12345',
    } as any);

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'media-1',
            caption: 'Summer vibe',
            media_type: 'IMAGE',
            media_url: 'https://cdn.instagram.com/p1.jpg',
            permalink: 'https://instagram.com/p/1',
            timestamp: '2026-06-01T12:00:00Z',
            like_count: 50,
            comments_count: 5,
          },
        ],
        paging: { cursors: { after: 'cursor-next' } },
      }),
    } as any);

    const result = await service.getMedia('u1', 'acc-1');

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('media-1');
    expect(result.paging?.cursors?.after).toBe('cursor-next');
  });
});

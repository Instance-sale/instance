import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: PrismaService;

  beforeEach(() => {
    prismaService = {
      user: {
        findFirst: vi.fn(),
      },
    } as unknown as PrismaService;
    controller = new HealthController(prismaService);
  });

  const createMockResponse = () => {
    const res: any = {
      statusCode: 200,
      status: vi.fn().mockImplementation((code: number) => {
        res.statusCode = code;
        return res;
      }),
    };
    return res;
  };

  it('returns status ok and connected database when prisma query succeeds', async () => {
    vi.mocked(prismaService.user.findFirst).mockResolvedValueOnce({ id: 'user-1' } as any);
    const mockRes = createMockResponse();

    const result = await controller.check(mockRes);

    expect(result.status).toBe('ok');
    expect(result.service).toBe('@instance/api');
    expect(result.database).toBe('connected');
    expect(mockRes.status).not.toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('sets 503 status code and returns error when database query throws', async () => {
    vi.mocked(prismaService.user.findFirst).mockRejectedValueOnce(new Error('DB Connection Refused'));
    const mockRes = createMockResponse();

    const result = await controller.check(mockRes);

    expect(result.status).toBe('error');
    expect(result.database).toBe('error');
    expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });
});

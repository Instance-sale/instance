import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as nodemailer from 'nodemailer';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

vi.mock('nodemailer', () => ({
  createTransport: vi.fn().mockReturnValue({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'mock-mail-id' }),
  }),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(() => {
    vi.clearAllMocks();

    prisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      account: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      verificationToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
    } as unknown as PrismaService;

    service = new AuthService(prisma);
  });

  describe('syncUser', () => {
    it('creates a new OWNER user when email does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      const fakeCreatedUser = {
        id: 'usr-new',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.png',
        role: 'OWNER',
        companyId: null,
        company: null,
        ownedCompanies: [],
      };
      vi.mocked(prisma.user.create).mockResolvedValueOnce(fakeCreatedUser as any);

      const result = await service.syncUser({
        email: '  TEST@example.com  ',
        name: 'Test User',
        image: 'https://example.com/avatar.png',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: { company: true, ownedCompanies: true },
      });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('OWNER');
    });

    it('updates missing name or image for existing user', async () => {
      const existingUser = {
        id: 'usr-1',
        email: 'user@example.com',
        name: null,
        image: null,
        role: 'USER',
        companyId: 'comp-1',
        company: { id: 'comp-1' },
        ownedCompanies: [],
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(existingUser as any);
      vi.mocked(prisma.user.update).mockResolvedValueOnce({
        ...existingUser,
        name: 'Updated Name',
        image: 'https://avatar.png',
      } as any);

      const result = await service.syncUser({
        email: 'user@example.com',
        name: 'Updated Name',
        image: 'https://avatar.png',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'usr-1' },
        data: { name: 'Updated Name', image: 'https://avatar.png' },
        include: { company: true, ownedCompanies: true },
      });
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('checkEmail', () => {
    it('returns exists true when user exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'usr-1' } as any);

      const res = await service.checkEmail('found@example.com');
      expect(res.exists).toBe(true);
    });

    it('returns exists false when user does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const res = await service.checkEmail('notfound@example.com');
      expect(res.exists).toBe(false);
    });
  });

  describe('sendVerificationEmail', () => {
    it('dispatches formatted verification email with magic link url', async () => {
      const result = await service.sendVerificationEmail(
        'user@example.com',
        'http://localhost:3000/api/auth/callback/email?token=xyz123',
      );

      expect(nodemailer.createTransport).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});

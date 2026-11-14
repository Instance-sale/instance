import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CompanyService, slugifyCompanyName, buildCompanyDashboardPath } from './company.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CompanyService and Utilities', () => {
  let service: CompanyService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      company: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    } as unknown as PrismaService;

    service = new CompanyService(prisma);
  });

  describe('slugifyCompanyName', () => {
    it('normalizes uppercase, spaces, and special symbols to hyphens', () => {
      expect(slugifyCompanyName('Acme Corp, Inc.!')).toBe('acme-corp-inc');
    });

    it('returns default fallback "company" for empty string', () => {
      expect(slugifyCompanyName('')).toBe('company');
      expect(slugifyCompanyName(null as any)).toBe('company');
    });
  });

  describe('buildCompanyDashboardPath', () => {
    it('constructs correct dashboard route slug path', () => {
      const res = buildCompanyDashboardPath({
        name: 'Super Agent Ltd',
        companyId: 'comp-xyz',
        dashboardKey: 'dash-key-1',
      });
      expect(res).toBe('/dashboard/comp-xyz');
    });
  });

  describe('getCompany', () => {
    it('throws NotFoundException when user has no company', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'u1', company: null } as any);

      await expect(service.getCompany('u1')).rejects.toThrow(
        new NotFoundException('Company not found'),
      );
    });

    it('returns user company when found', async () => {
      const company = { id: 'c1', name: 'Test Co' };
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'u1', company } as any);

      const res = await service.getCompany('u1');
      expect(res).toEqual(company);
    });
  });

  describe('createCompany', () => {
    it('throws BadRequestException if name is missing', async () => {
      await expect(service.createCompany('u1', { name: '' } as any)).rejects.toThrow(
        new BadRequestException('Company name is required'),
      );
    });

    it('throws BadRequestException if user already has a company without createNewAccount', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'u1',
        company: { id: 'existing-c' },
      } as any);

      await expect(
        service.createCompany('u1', { name: 'Second Co' } as any),
      ).rejects.toThrow(new BadRequestException('User already has a company'));
    });

    it('creates company and promotes user to OWNER', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'u1',
        company: null,
      } as any);
      vi.mocked(prisma.company.findUnique).mockResolvedValueOnce(null); // unique companyId check
      const createdCompany = { id: 'c-new', name: 'New Co', companyId: 'gen-id' };
      vi.mocked(prisma.company.create).mockResolvedValueOnce(createdCompany as any);
      vi.mocked(prisma.user.update).mockResolvedValueOnce({ id: 'u1' } as any);

      const res = await service.createCompany('u1', { name: 'New Co' });

      expect(prisma.company.create).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { companyId: 'c-new', role: 'OWNER' },
      });
      expect(res).toEqual(createdCompany);
    });
  });
});

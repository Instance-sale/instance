import * as path from 'path';
import * as dotenv from 'dotenv';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

export function slugifyCompanyName(name: string): string {
  return (
    name
      ?.toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'company'
  );
}

export function buildCompanyDashboardPath(company: {
  companyId: string;
  name?: string;
  dashboardKey?: string;
}): string {
  return `/dashboard/${company.companyId}`;
}

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  private generateCompanyId(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 15; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async generateUniqueCompanyId(): Promise<string> {
    let companyId = '';
    let exists = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (exists && attempts < maxAttempts) {
      companyId = this.generateCompanyId();
      const existing = await this.prisma.company.findUnique({
        where: { companyId },
      });
      if (!existing) {
        exists = false;
      }
      attempts++;
    }

    if (exists) {
      throw new Error('Failed to generate unique company ID');
    }

    return companyId;
  }

  async getCompany(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user?.company) {
      throw new NotFoundException('Company not found');
    }

    return user.company;
  }

  async createCompany(userId: string, data: CreateCompanyDto) {
    if (!data.name) {
      throw new BadRequestException('Company name is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (user?.company && data.createNewAccount !== true) {
      throw new BadRequestException('User already has a company');
    }

    const companyId = await this.generateUniqueCompanyId();

    const company = await this.prisma.company.create({
      data: {
        name: data.name,
        companyId,
        instagramHandle: data.instagramHandle || null,
        ownerId: userId,
        ownerName: data.ownerName || null,
        ownerRole: data.ownerRole || null,
        numberOfEmployees: data.numberOfEmployees
          ? Number(data.numberOfEmployees)
          : null,
        websiteUrl: data.websiteUrl || null,
        companyEmail: data.companyEmail || null,
        companyImage: data.companyImage || null,
        companyDescription: data.companyDescription || null,        setupComplete: data.setupComplete === true,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        companyId: company.id,
        role: 'OWNER',
      },
    });

    return company;
  }

  async saveProgress(userId: string, data: UpdateCompanyDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.company && data.createNewAccount !== true) {
      if (user.role && !['OWNER', 'ADMIN'].includes(user.role)) {
        throw new ForbiddenException('Access denied: Requires OWNER or ADMIN role');
      }
      if (user.companyId !== user.company.id) {
        throw new ForbiddenException('Unauthorized: Company mismatch');
      }

      const company = await this.prisma.company.update({
        where: { id: user.company.id },
        data: {
          name: data.name || user.company.name,
          instagramHandle:
            data.instagramHandle !== undefined
              ? data.instagramHandle
              : user.company.instagramHandle,
          ownerName:
            data.ownerName !== undefined
              ? data.ownerName
              : user.company.ownerName,
          ownerRole:
            data.ownerRole !== undefined
              ? data.ownerRole
              : user.company.ownerRole,
          numberOfEmployees:
            data.numberOfEmployees !== undefined
              ? Number(data.numberOfEmployees)
              : user.company.numberOfEmployees,
          websiteUrl:
            data.websiteUrl !== undefined
              ? data.websiteUrl
              : user.company.websiteUrl,
          companyEmail:
            data.companyEmail !== undefined
              ? data.companyEmail
              : user.company.companyEmail,
          companyImage:
            data.companyImage !== undefined
              ? data.companyImage
              : user.company.companyImage,
          companyDescription:
            data.companyDescription !== undefined
              ? data.companyDescription
              : user.company.companyDescription,          setupComplete: data.setupComplete === true ? true : undefined,
        },
      });

      return { success: true, company };
    } else {
      if (!data.name) {
        throw new BadRequestException('Company name is required');
      }

      const companyId = await this.generateUniqueCompanyId();

      const company = await this.prisma.company.create({
        data: {
          name: data.name,
          companyId,
          instagramHandle: data.instagramHandle || null,
          ownerId: userId,
          ownerName: data.ownerName || null,
          ownerRole: data.ownerRole || null,
          numberOfEmployees: data.numberOfEmployees
            ? Number(data.numberOfEmployees)
            : null,
          websiteUrl: data.websiteUrl || null,
          companyEmail: data.companyEmail || null,
          companyImage: data.companyImage || null,
          companyDescription: data.companyDescription || null,          setupComplete: data.setupComplete === true,
        },
      });

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          companyId: company.id,
          role: 'OWNER',
        },
      });

      return { success: true, company };
    }
  }

  async getUserAccounts(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const companies = await this.prisma.company.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        companyId: true,
        dashboardKey: true,
        setupComplete: true,
        ownerId: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const accounts = companies.map((company) => ({
      id: company.id,
      name: company.name,
      companyId: company.companyId,
      dashboardKey: company.dashboardKey,
      setupComplete: company.setupComplete,
      path: buildCompanyDashboardPath(company),
      role: 'OWNER',
      isOwner: true,
    }));

    return {
      activeCompanyId: user.companyId || null,
      accounts,
    };
  }
}

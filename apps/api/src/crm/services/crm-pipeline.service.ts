import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CrmPipelineService {
  constructor(private readonly prisma: PrismaService) { }

  async updateLeadStatus(userCompanyId: string, profileId: string, status: string) {
    if (!userCompanyId) {
      throw new ForbiddenException('User has no company assigned');
    }

    const profile = await this.prisma.instagramUserProfile.findUnique({
      where: { id: profileId },
      include: { instagramAccount: true },
    });

    if (!profile || profile.instagramAccount?.companyId !== userCompanyId) {
      throw new NotFoundException('Lead profile not found');
    }

    const updated = await this.prisma.instagramUserProfile.update({
      where: { id: profileId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });



    return { success: true, lead: updated };
  }

  async updateLeadTags(userCompanyId: string, profileId: string, tags: string[]) {
    if (!userCompanyId) {
      throw new ForbiddenException('User has no company assigned');
    }

    const profile = await this.prisma.instagramUserProfile.findUnique({
      where: { id: profileId },
      include: { instagramAccount: true },
    });

    if (!profile || profile.instagramAccount?.companyId !== userCompanyId) {
      throw new NotFoundException('Lead profile not found');
    }

    const updated = await this.prisma.instagramUserProfile.update({
      where: { id: profileId },
      data: {
        tags,
        updatedAt: new Date(),
      },
    });

    return { success: true, tags: updated.tags };
  }

  async getPipelineConfig(userCompanyId: string) {
    if (!userCompanyId) {
      throw new ForbiddenException('User has no company assigned');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: userCompanyId },
      select: {
        customStatuses: true,
        customTags: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const defaultStatuses = ['New', 'Engaged', 'Qualified'];
    const customStatuses =
      company.customStatuses !== null &&
        company.customStatuses !== undefined &&
        Array.isArray(company.customStatuses) &&
        (company.customStatuses as string[]).length > 0
        ? (company.customStatuses as string[])
        : defaultStatuses;

    const defaultTags = ['VIP', 'Hot Lead', 'High Budget', 'Warm'];
    const customTags =
      company.customTags !== null &&
        company.customTags !== undefined &&
        Array.isArray(company.customTags)
        ? (company.customTags as string[])
        : defaultTags;

    return {
      customStatuses,
      customTags,
      config: {
        customStatuses,
        customTags,
      },
    };
  }

  async updatePipelineConfig(
    userCompanyId: string,
    data: {
      customStatuses?: string[];
      customTags?: string[];
    },
  ) {
    if (!userCompanyId) {
      throw new ForbiddenException('User has no company assigned');
    }

    // Validate custom statuses: require at least 1 status stage
    if (data.customStatuses) {
      if (!Array.isArray(data.customStatuses) || data.customStatuses.length < 1) {
        throw new BadRequestException('At least 1 custom status stage is required.');
      }
    }

    const updated = await this.prisma.company.update({
      where: { id: userCompanyId },
      data: {
        ...(data.customStatuses !== undefined && { customStatuses: data.customStatuses }),
        ...(data.customTags !== undefined && { customTags: data.customTags }),
        updatedAt: new Date(),
      },
      select: {
        customStatuses: true,
        customTags: true,
      },
    });

    const customStatuses = (updated.customStatuses as string[]) || [];
    const customTags = (updated.customTags as string[]) || [];

    return {
      success: true,
      customStatuses,
      customTags,
      config: {
        customStatuses,
        customTags,
      },
    };
  }
}


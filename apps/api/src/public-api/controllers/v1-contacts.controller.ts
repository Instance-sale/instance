import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PublicApiKeyGuard } from '../guards/public-api-key.guard';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { CrmService } from '../../crm/crm.service';
import { V1QueryContactsDto } from '../dto/v1-query-contacts.dto';
import {
  V1CreateContactDto,
  V1UpdateContactDto,
  V1UpdateTagsDto,
  V1UpdateStatusDto,
} from '../dto/v1-contact-ops.dto';

@Controller('v1/contacts')
@Public()
@UseGuards(PublicApiKeyGuard)
export class V1ContactsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crmService: CrmService,
  ) {}

  private async getTargetInstagramAccount(companyId: string, requestedAccountId?: string) {
    if (requestedAccountId) {
      const account = await this.prisma.instagramAccount.findFirst({
        where: { id: requestedAccountId, companyId },
      });
      if (!account) {
        throw new NotFoundException({
          status: 'error',
          message: 'Specified Instagram account not found for this workspace',
          code: 404,
        });
      }
      return account;
    }

    const defaultAccount = await this.prisma.instagramAccount.findFirst({
      where: { companyId },
      orderBy: { connectedAt: 'asc' },
    });

    if (!defaultAccount) {
      throw new BadRequestException({
        status: 'error',
        message: 'No Instagram account connected to this workspace yet',
        code: 400,
      });
    }

    return defaultAccount;
  }

  private formatSubscriber(profile: any) {
    return {
      id: profile.id,
      ig_username: profile.username,
      ig_id: profile.instagramUserId,
      name: profile.fullName || profile.username,
      email: profile.email,
      phone: profile.phone,
      followers_count: profile.followersCount,
      following_count: profile.followingCount,
      qualification_score: profile.qualificationScore,
      qualification_summary: profile.qualificationSummary,
      is_qualified: profile.isQualified,
      status: profile.status || 'New',
      tags: Array.isArray(profile.tags) ? profile.tags : [],
      last_interaction: profile.updatedAt || profile.createdAt,
      created_at: profile.createdAt,
    };
  }

  @Get()
  async listContacts(@Req() req: any, @Query() query: V1QueryContactsDto) {
    const igAccount = await this.getTargetInstagramAccount(req.companyId);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = {
      instagramAccountId: igAccount.id,
    };

    if (query.search) {
      where.OR = [
        { username: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.qualified !== undefined) {
      where.isQualified = query.qualified === 'true';
    }

    if (query.minScore !== undefined || query.maxScore !== undefined) {
      where.qualificationScore = {};
      if (query.minScore !== undefined) where.qualificationScore.gte = Number(query.minScore);
      if (query.maxScore !== undefined) where.qualificationScore.lte = Number(query.maxScore);
    }

    const [profiles, total] = await Promise.all([
      this.prisma.instagramUserProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.instagramUserProfile.count({ where }),
    ]);

    return {
      status: 'success',
      data: profiles.map((p) => this.formatSubscriber(p)),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  @Get('find')
  async findContact(
    @Req() req: any,
    @Query('username') username?: string,
    @Query('email') email?: string,
    @Query('phone') phone?: string,
  ) {
    const igAccount = await this.getTargetInstagramAccount(req.companyId);

    if (!username && !email && !phone) {
      throw new BadRequestException({
        status: 'error',
        message: 'Must provide either username, email, or phone parameter',
        code: 400,
      });
    }

    const where: any = { instagramAccountId: igAccount.id };

    if (username) {
      const cleanUsername = username.replace(/^@/, '').trim();
      where.username = { equals: cleanUsername, mode: 'insensitive' };
    } else if (email) {
      where.email = { equals: email.trim(), mode: 'insensitive' };
    } else if (phone) {
      where.phone = { equals: phone.trim() };
    }

    const profile = await this.prisma.instagramUserProfile.findFirst({
      where,
    });

    if (!profile) {
      throw new NotFoundException({
        status: 'error',
        message: 'Contact not found',
        code: 404,
      });
    }

    return {
      status: 'success',
      data: this.formatSubscriber(profile),
    };
  }

  @Get(':id')
  async getContact(@Req() req: any, @Param('id') id: string) {
    const profile = await this.prisma.instagramUserProfile.findFirst({
      where: {
        id,
        instagramAccount: { companyId: req.companyId },
      },
    });

    if (!profile) {
      throw new NotFoundException({
        status: 'error',
        message: 'Contact not found',
        code: 404,
      });
    }

    return {
      status: 'success',
      data: this.formatSubscriber(profile),
    };
  }

  @Post()
  async createSubscriber(@Req() req: any, @Body() dto: V1CreateContactDto) {
    const igAccount = await this.getTargetInstagramAccount(req.companyId);

    const cleanUsername = dto.username ? dto.username.replace(/^@/, '').trim() : null;
    const placeholderUserId = `ext_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const profile = await this.prisma.instagramUserProfile.create({
      data: {
        instagramAccountId: igAccount.id,
        instagramUserId: placeholderUserId,
        username: cleanUsername,
        fullName: dto.name || cleanUsername,
        email: dto.email,
        phone: dto.phone,
        status: dto.status || 'New',
        tags: dto.tags || [],
      },
    });

    return {
      status: 'success',
      data: this.formatSubscriber(profile),
    };
  }

  @Patch(':id')
  async updateSubscriber(@Req() req: any, @Param('id') id: string, @Body() dto: V1UpdateContactDto) {
    const existing = await this.prisma.instagramUserProfile.findFirst({
      where: { id, instagramAccount: { companyId: req.companyId } },
    });

    if (!existing) {
      throw new NotFoundException({
        status: 'error',
        message: 'Contact not found',
        code: 404,
      });
    }

    const dataToUpdate: any = {};
    if (dto.name !== undefined) dataToUpdate.fullName = dto.name;
    if (dto.email !== undefined) dataToUpdate.email = dto.email;
    if (dto.phone !== undefined) dataToUpdate.phone = dto.phone;
    if (dto.status !== undefined) dataToUpdate.status = dto.status;
    if (dto.tags !== undefined) dataToUpdate.tags = dto.tags;

    const updated = await this.prisma.instagramUserProfile.update({
      where: { id },
      data: dataToUpdate,
    });

    return {
      status: 'success',
      data: this.formatSubscriber(updated),
    };
  }

  @Post(':id/tags')
  async addTagsToSubscriber(@Req() req: any, @Param('id') id: string, @Body() dto: V1UpdateTagsDto) {
    const existing = await this.prisma.instagramUserProfile.findFirst({
      where: { id, instagramAccount: { companyId: req.companyId } },
    });

    if (!existing) {
      throw new NotFoundException({
        status: 'error',
        message: 'Contact not found',
        code: 404,
      });
    }

    const currentTags = Array.isArray(existing.tags) ? (existing.tags as string[]) : [];
    const newTags = Array.from(new Set([...currentTags, ...dto.tags]));

    const updated = await this.prisma.instagramUserProfile.update({
      where: { id },
      data: { tags: newTags },
    });

    return {
      status: 'success',
      data: this.formatSubscriber(updated),
    };
  }

  @Delete(':id/tags/:name')
  async removeTagFromSubscriber(
    @Req() req: any,
    @Param('id') id: string,
    @Param('name') name: string,
  ) {
    const existing = await this.prisma.instagramUserProfile.findFirst({
      where: { id, instagramAccount: { companyId: req.companyId } },
    });

    if (!existing) {
      throw new NotFoundException({
        status: 'error',
        message: 'Contact not found',
        code: 404,
      });
    }

    const targetTag = decodeURIComponent(name).trim();
    const currentTags = Array.isArray(existing.tags) ? (existing.tags as string[]) : [];
    const newTags = currentTags.filter((t) => t !== targetTag);

    const updated = await this.prisma.instagramUserProfile.update({
      where: { id },
      data: { tags: newTags },
    });

    return {
      status: 'success',
      data: this.formatSubscriber(updated),
    };
  }

  @Post(':id/status')
  async updateSubscriberStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: V1UpdateStatusDto,
  ) {
    const existing = await this.prisma.instagramUserProfile.findFirst({
      where: { id, instagramAccount: { companyId: req.companyId } },
    });

    if (!existing) {
      throw new NotFoundException({
        status: 'error',
        message: 'Contact not found',
        code: 404,
      });
    }

    const updated = await this.prisma.instagramUserProfile.update({
      where: { id },
      data: { status: dto.status },
    });

    return {
      status: 'success',
      data: this.formatSubscriber(updated),
    };
  }
}

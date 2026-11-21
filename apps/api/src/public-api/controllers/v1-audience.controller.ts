import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { PublicApiKeyGuard } from '../guards/public-api-key.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../../prisma/prisma.service';
import { CrmService } from '../../crm/crm.service';
import {
  V1CreateAudienceListDto,
  V1QueryAudienceContactsDto,
  V1AssignAudienceContactsDto,
} from '../dto/v1-audience.dto';

@Controller('v1/audience-lists')
@Public()
@UseGuards(PublicApiKeyGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class V1AudienceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crmService: CrmService,
  ) {}

  @Get()
  async getAudienceLists(@Req() req: any) {
    const lists = await this.crmService.getAudienceLists(req.companyId);
    return {
      status: 'success',
      data: lists,
    };
  }

  @Post()
  async createAudienceList(@Req() req: any, @Body() dto: V1CreateAudienceListDto) {
    const created = await this.crmService.createAudienceList(req.companyId, {
      name: dto.name,
      description: dto.description,
      color: dto.color,
    });

    return {
      status: 'success',
      data: created,
    };
  }

  @Get(':id/contacts')
  async getAudienceContacts(
    @Req() req: any,
    @Param('id') id: string,
    @Query() query: V1QueryAudienceContactsDto,
  ) {
    const list = await this.prisma.audienceList.findFirst({
      where: { id, companyId: req.companyId },
    });

    if (!list) {
      throw new NotFoundException({
        status: 'error',
        message: 'Audience list not found in this workspace',
        code: 404,
      });
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    const result = await this.crmService.getEmailList(req.companyId, {
      page,
      limit,
      search: query.search,
      audienceListId: id,
      channelFilter: query.channelFilter || 'all',
    });

    return {
      status: 'success',
      audience_list: {
        id: list.id,
        name: list.name,
        color: list.color,
        description: list.description,
      },
      data: (result as any)?.leads || result || [],
      pagination: {
        page,
        limit,
        total: (result as any)?.total ?? (Array.isArray(result) ? result.length : 0),
      },
    };
  }

  @Post(':id/assign')
  async assignContacts(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: V1AssignAudienceContactsDto,
  ) {
    const list = await this.prisma.audienceList.findFirst({
      where: { id, companyId: req.companyId },
    });

    if (!list) {
      throw new NotFoundException({
        status: 'error',
        message: 'Audience list not found in this workspace',
        code: 404,
      });
    }

    const profiles = await this.prisma.instagramUserProfile.findMany({
      where: {
        id: { in: dto.contactIds },
        instagramAccount: { companyId: req.companyId },
      },
      select: { instagramAccountId: true, instagramUserId: true },
    });

    const userIds = profiles.map((p) => p.instagramUserId);
    const captures = await this.prisma.contactCapture.findMany({
      where: {
        instagramUserId: { in: userIds },
      },
      select: { id: true },
    });

    const captureIds = captures.map((c) => c.id);

    if (captureIds.length > 0) {
      await this.crmService.bulkAssignAudienceList(
        req.companyId,
        captureIds,
        id,
        'assign',
      );
    }

    return {
      status: 'success',
      message: `Assigned ${captureIds.length} contact(s) to audience list '${list.name}'`,
      data: {
        audience_list_id: list.id,
        assigned_count: captureIds.length,
      },
    };
  }

  @Delete(':id')
  async deleteAudienceList(@Req() req: any, @Param('id') id: string) {
    await this.crmService.deleteAudienceList(req.companyId, id);

    return {
      status: 'success',
      message: 'Audience list deleted successfully',
    };
  }
}

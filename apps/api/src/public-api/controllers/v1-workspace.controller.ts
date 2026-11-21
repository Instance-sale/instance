import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { PublicApiKeyGuard } from '../guards/public-api-key.guard';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { CrmService } from '../../crm/crm.service';
import { AutomationsService } from '../../automations/automations.service';

@Controller('v1')
@Public()
@UseGuards(PublicApiKeyGuard)
export class V1WorkspaceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crmService: CrmService,
    private readonly automationsService: AutomationsService,
  ) {}

  @Get('workspace/info')
  async getWorkspaceInfo(@Req() req: any) {
    const company = await this.prisma.company.findUnique({
      where: { id: req.companyId },
      include: {
        instagramAccounts: {
          select: {
            id: true,
            username: true,
            profilePictureUrl: true,
            accountType: true,
            isActive: true,
            connectedAt: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException({
        status: 'error',
        message: 'Workspace not found',
        code: 404,
      });
    }

    return {
      status: 'success',
      data: {
        id: company.id,
        name: company.name,
        company_id: company.companyId,
        website_url: company.websiteUrl,
        company_email: company.companyEmail,
        instagram_handle: company.instagramHandle,
        created_at: company.createdAt,
        connected_instagram_accounts: company.instagramAccounts,
      },
    };
  }

  @Get('tags')
  async getTags(@Req() req: any) {
    const pipelineConfig = await this.crmService.getPipelineConfig(req.companyId);
    return {
      status: 'success',
      data: {
        tags: pipelineConfig?.customTags || [],
      },
    };
  }

  @Post('tags')
  async createTag(@Req() req: any, @Body() body: { name: string }) {
    if (!body?.name || typeof body.name !== 'string') {
      return {
        status: 'error',
        message: 'Tag name is required',
        code: 400,
      };
    }

    const tagName = body.name.trim();
    const config = await this.crmService.getPipelineConfig(req.companyId);
    const existingTags = config?.customTags || [];

    if (!existingTags.includes(tagName)) {
      const updatedTags = [...existingTags, tagName];
      await this.crmService.updatePipelineConfig(req.companyId, { customTags: updatedTags });
    }

    return {
      status: 'success',
      data: {
        tag: tagName,
      },
    };
  }

  @Delete('tags/:name')
  async deleteTag(@Req() req: any, @Param('name') name: string) {
    const tagName = decodeURIComponent(name).trim();
    const config = await this.crmService.getPipelineConfig(req.companyId);
    const existingTags = config?.customTags || [];

    const updatedTags = existingTags.filter((t: string) => t !== tagName);
    await this.crmService.updatePipelineConfig(req.companyId, { customTags: updatedTags });

    return {
      status: 'success',
      message: `Tag '${tagName}' removed successfully`,
    };
  }

  @Get('automations')
  async getAutomations(@Req() req: any) {
    const res = await this.automationsService.getAutomations(req.companyId);
    const automations = res?.automations || [];
    const formatted = automations.map((a: any) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      is_active: a.isActive,
      trigger_type: a.triggerType,
      trigger_keywords: a.triggerKeywords,
      created_at: a.createdAt,
      updated_at: a.updatedAt,
    }));

    return {
      status: 'success',
      data: formatted,
    };
  }

  @Get('pipelines')
  async getPipelines(@Req() req: any) {
    const config = await this.crmService.getPipelineConfig(req.companyId);
    return {
      status: 'success',
      data: {
        custom_statuses: config?.customStatuses || [],
        custom_tags: config?.customTags || [],
      },
    };
  }
}

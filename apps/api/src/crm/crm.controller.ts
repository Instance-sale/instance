import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { CrmService } from './crm.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { LeadQueryDto } from './dto/lead-query.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { EmailListQueryDto } from './dto/email-list-query.dto';
import {
  CreateAudienceListDto,
  UpdateAudienceListDto,
  ReassignContactAudienceListDto,
  BulkAssignAudienceListDto,
} from './dto/audience-list.dto';

@Controller()
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  private getCompanyId(user: any): string {
    const companyId = user?.companyId || user?.company?.id || user?.ownedCompanies?.[0]?.id;
    if (!companyId) {
      throw new UnauthorizedException('Company required');
    }
    return companyId;
  }


  @Get('leads')
  async getLeads(
    @CurrentUser() user: any,
    @Query() query: LeadQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.crmService.getLeads(
      user.id,
      (user?.companyId || user?.company?.id || user?.ownedCompanies?.[0]?.id) || null,
      query,
    );

    if ((result as any).isExport) {
      const exportResult = result as {
        isExport: boolean;
        format: 'csv' | 'xml';
        content: string;
      };
      const dateStr = new Date().toISOString().split('T')[0];

      if (exportResult.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="leads-${dateStr}.csv"`,
        );
      } else {
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="leads-${dateStr}.xml"`,
        );
      }
      return res.send(exportResult.content);
    }

    return res.json(result);
  }

  @Post('crm/update-contact')
  @Roles('OWNER')
  async updateContact(
    @CurrentUser() user: any,
    @Body() dto: UpdateContactDto,
  ) {
    return this.crmService.updateContact(this.getCompanyId(user), dto);
  }

  @Post('crm/update-lead-status')
  @Roles('OWNER')
  async updateLeadStatus(
    @CurrentUser() user: any,
    @Body() body: { profileId: string; status: string },
  ) {
    return this.crmService.updateLeadStatus(this.getCompanyId(user), body.profileId, body.status);
  }

  @Post('crm/update-lead-tags')
  @Roles('OWNER')
  async updateLeadTags(
    @CurrentUser() user: any,
    @Body() body: { profileId: string; tags: string[] },
  ) {
    return this.crmService.updateLeadTags(this.getCompanyId(user), body.profileId, body.tags);
  }

  @Get('crm/pipeline-config')
  async getPipelineConfig(@CurrentUser() user: any) {
    return this.crmService.getPipelineConfig(this.getCompanyId(user));
  }

  @Post('crm/pipeline-config')
  @Roles('OWNER')
  async updatePipelineConfig(
    @CurrentUser() user: any,
    @Body() body: { customStatuses?: string[]; customTags?: string[]; },
  ) {
    return this.crmService.updatePipelineConfig(this.getCompanyId(user), body);
  }

  @Get('email-list')
  async getEmailList(
    @CurrentUser() user: any,
    @Query() query: EmailListQueryDto,
  ) {
    const companyId = this.getCompanyId(user);
    return this.crmService.getEmailList(companyId, query);
  }

  @Get('audience-contacts')
  async getAudienceContacts(
    @CurrentUser() user: any,
    @Query() query: EmailListQueryDto,
  ) {
    const companyId = this.getCompanyId(user);
    return this.crmService.getEmailList(companyId, query);
  }

  @Get(['audience-lists', 'crm/audience-lists'])
  async getAudienceLists(@CurrentUser() user: any) {
    const companyId = this.getCompanyId(user);
    return this.crmService.getAudienceLists(companyId);
  }

  @Post('audience-lists')
  @Roles('OWNER')
  async createAudienceList(
    @CurrentUser() user: any,
    @Body() body: CreateAudienceListDto,
  ) {
    const companyId = this.getCompanyId(user);
    return this.crmService.createAudienceList(companyId, body);
  }

  @Post('audience-lists/:id')
  @Roles('OWNER')
  async updateAudienceList(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: UpdateAudienceListDto,
  ) {
    const companyId = this.getCompanyId(user);
    return this.crmService.updateAudienceList(companyId, id, body);
  }

  @Delete('audience-lists/:id')
  @Roles('OWNER')
  async deleteAudienceList(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const companyId = this.getCompanyId(user);
    return this.crmService.deleteAudienceList(companyId, id);
  }

  @Post('audience-lists/:id/pin')
  @Roles('OWNER')
  async togglePinAudienceList(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const companyId = this.getCompanyId(user);
    return this.crmService.togglePinAudienceList(companyId, id);
  }

  @Post('audience-lists/reassign')
  @Roles('OWNER')
  async reassignContact(
    @CurrentUser() user: any,
    @Body() body: ReassignContactAudienceListDto,
  ) {
    const companyId = this.getCompanyId(user);
    return this.crmService.reassignContactAudienceList(
      companyId,
      body.contactCaptureId,
      body.audienceListId,
      body.action,
    );
  }

  @Post('audience-lists/bulk-assign')
  @Roles('OWNER')
  async bulkAssignContacts(
    @CurrentUser() user: any,
    @Body() body: BulkAssignAudienceListDto,
  ) {
    const companyId = this.getCompanyId(user);
    return this.crmService.bulkAssignAudienceList(
      companyId,
      body.contactCaptureIds,
      body.audienceListId,
      body.action,
    );
  }
}

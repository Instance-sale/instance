import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadQueryDto } from './dto/lead-query.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { EmailListQueryDto } from './dto/email-list-query.dto';
import { CrmExportService } from './services/crm-export.service';
import { CrmAudienceListService } from './services/crm-audience-list.service';
import { CrmPipelineService } from './services/crm-pipeline.service';

const SORT_FIELDS = [
  'createdAt',
  'username',
  'fullName',
  'firstInteractionAt',
] as const;

type SortField = typeof SORT_FIELDS[number];

@Injectable()
export class CrmService {
  private readonly exportService: CrmExportService;
  private readonly audienceListService: CrmAudienceListService;
  private readonly pipelineService: CrmPipelineService;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() exportService?: CrmExportService,
    @Optional() audienceListService?: CrmAudienceListService,
    @Optional() pipelineService?: CrmPipelineService,
  ) {
    this.exportService = exportService ?? new CrmExportService(prisma);
    this.audienceListService = audienceListService ?? new CrmAudienceListService(prisma);
    this.pipelineService = pipelineService ?? new CrmPipelineService(prisma);
  }

  async getLeads(userId: string, userCompanyId: string | null, query: LeadQueryDto) {
    const accountId = query.accountId;
    if (!accountId) {
      throw new BadRequestException('Missing accountId parameter');
    }

    if (!userCompanyId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { company: true },
      });
      if (!user?.company) {
        throw new NotFoundException('Company not found');
      }
      userCompanyId = user.company.id;
    }

    const instagramAccount = await this.prisma.instagramAccount.findFirst({
      where: {
        id: accountId,
        companyId: userCompanyId,
      },
    });

    if (!instagramAccount) {
      throw new NotFoundException('Instagram account not found or access denied');
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const offset = (page - 1) * limit;



    const where = this.exportService.buildWhereClause(accountId, query);
    const sortBy: SortField = SORT_FIELDS.includes(query.sortBy as SortField)
      ? (query.sortBy as SortField)
      : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy = { [sortBy]: sortOrder };

    if (query.export === 'csv' || query.export === 'xml') {
      const allRawLeads = await this.prisma.instagramUserProfile.findMany({
        where,
        orderBy,
      });

      const participantIds = allRawLeads.map((l) => l.instagramUserId);
      const captures = await this.prisma.contactCapture.findMany({
        where: {
          instagramAccountId: accountId,
          instagramUserId: { in: participantIds },
        },
      });

      const captureMap = new Map<string, (typeof captures)[number]>(
        captures.map((c) => [c.instagramUserId, c]),
      );

      const allLeads = allRawLeads.map((lead) => {
        const capture = captureMap.get(lead.instagramUserId);
        const capturedEmails: string[] = Array.isArray(capture?.emails)
          ? (capture.emails as string[])
          : [];
        const capturedPhones: string[] = Array.isArray(capture?.phoneNumbers)
          ? (capture.phoneNumbers as string[])
          : [];

        const emails = [
          ...(lead.email ? [lead.email] : []),
          ...capturedEmails,
        ].filter((v, i, a) => a.indexOf(v) === i);

        const phoneNumbers = [
          ...(lead.phone ? [lead.phone] : []),
          ...capturedPhones,
        ].filter((v, i, a) => a.indexOf(v) === i);

        return {
          ...lead,
          emails,
          phoneNumbers,
          tags: Array.isArray(lead.tags) ? (lead.tags as string[]) : [],
          status: lead.status || 'New',
        };
      });

      const fieldList = query.fields
        ? query.fields.split(',').map((f) => f.trim()).filter(Boolean)
        : undefined;

      return {
        isExport: true,
        format: query.export,
        content:
          query.export === 'csv'
            ? this.exportService.exportAsCSV(allLeads, fieldList)
            : this.exportService.exportAsXML(allLeads, fieldList),
      };
    }

    const [rawLeads, total] = await Promise.all([
      this.prisma.instagramUserProfile.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
      this.prisma.instagramUserProfile.count({ where }),
    ]);

    const participantIds = rawLeads.map((l) => l.instagramUserId);
    const [captures, executions] = await Promise.all([
      this.prisma.contactCapture.findMany({
        where: {
          instagramAccountId: accountId,
          instagramUserId: { in: participantIds },
        },
        include: {
          audienceListMembers: {
            include: {
              audienceList: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.automationExecution.findMany({
        where: {
          instagramUserId: { in: participantIds },
          automation: {
            folder: {
              instagramAccountId: accountId,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        include: {
          automation: {
            select: {
              id: true,
              name: true,
              nodes: true,
              folder: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const captureMap = new Map<string, (typeof captures)[number]>(
      captures.map((c) => [c.instagramUserId, c]),
    );
    const executionMap = new Map<
      string,
      { automationId: string; automationName: string; folderName?: string | null; folderColor?: string | null; selectedStages?: string[] }
    >();
    for (const exec of executions) {
      if (!executionMap.has(exec.instagramUserId) && exec.automation) {
        executionMap.set(exec.instagramUserId, {
          automationId: exec.automation.id,
          automationName: exec.automation.name,
          folderName: exec.automation.folder?.name ?? null,
          folderColor: exec.automation.folder?.color ?? null,
          selectedStages: [],
        });
      }
    }

    const leads = rawLeads.map((lead) => {
      const capture = captureMap.get(lead.instagramUserId);
      const originAutomation = executionMap.get(lead.instagramUserId) || null;

      const capturedEmails: string[] = Array.isArray(capture?.emails)
        ? (capture.emails as string[])
        : [];
      const capturedPhones: string[] = Array.isArray(capture?.phoneNumbers)
        ? (capture.phoneNumbers as string[])
        : [];

      const emails = [
        ...(lead.email ? [lead.email] : []),
        ...capturedEmails,
      ].filter((v, i, a) => a.indexOf(v) === i);

      const phoneNumbers = [
        ...(lead.phone ? [lead.phone] : []),
        ...capturedPhones,
      ].filter((v, i, a) => a.indexOf(v) === i);

      const audienceLists = (capture as any)?.audienceListMembers?.map((m: any) => ({
        id: m.audienceList.id,
        name: m.audienceList.name,
        color: m.audienceList.color,
      })) || [];

      return {
        ...lead,
        originAutomation,
        status: lead.status || 'New',
        tags: Array.isArray(lead.tags) ? (lead.tags as string[]) : [],
        emails,
        phoneNumbers,
        contactCaptureId: capture?.id || null,
        audienceLists,
        primaryAudienceList: audienceLists[0] || null,
      };
    });

    const stats = await this.getLeadStats(accountId);

    return {
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + leads.length < total,
      },
      stats,
    };
  }

  async updateContact(userCompanyId: string, dto: UpdateContactDto) {
    if (!userCompanyId) {
      throw new ForbiddenException('User has no company assigned');
    }

    const profile = await this.prisma.instagramUserProfile.findUnique({
      where: { id: dto.profileId },
      include: {
        instagramAccount: {
          select: { companyId: true },
        },
      },
    });

    if (!profile || profile.instagramAccount?.companyId !== userCompanyId) {
      throw new NotFoundException('Profile not found');
    }

    const updatedProfile = await this.prisma.instagramUserProfile.update({
      where: { id: dto.profileId },
      data: {
        email: dto.email || null,
        phone: dto.phone || null,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      profile: updatedProfile,
    };
  }

  private async getLeadStats(instagramAccountId: string) {
    const total = await this.prisma.instagramUserProfile.count({
      where: { instagramAccountId },
    });

    return {
      total,
      qualified: 0,
      averageScore: 0,
    };
  }

  async getEmailList(companyId: string, query: EmailListQueryDto) {
    return this.exportService.getEmailList(companyId, query);
  }

  async getAudienceLists(companyId: string) {
    return this.audienceListService.getAudienceLists(companyId);
  }

  async createAudienceList(companyId: string, data: { name: string; description?: string; color?: string; isPinned?: boolean }) {
    return this.audienceListService.createAudienceList(companyId, data);
  }

  async updateAudienceList(companyId: string, listId: string, data: { name?: string; description?: string; color?: string; isPinned?: boolean; pinnedOrder?: number }) {
    return this.audienceListService.updateAudienceList(companyId, listId, data);
  }

  async deleteAudienceList(companyId: string, listId: string) {
    return this.audienceListService.deleteAudienceList(companyId, listId);
  }

  async togglePinAudienceList(companyId: string, listId: string) {
    return this.audienceListService.togglePinAudienceList(companyId, listId);
  }

  async reassignContactAudienceList(companyId: string, contactCaptureId: string, audienceListId: string, action: 'assign' | 'unassign' | 'set' = 'set') {
    return this.audienceListService.reassignContactAudienceList(companyId, contactCaptureId, audienceListId, action);
  }

  async bulkAssignAudienceList(companyId: string, contactCaptureIds: string[], audienceListId: string, action: 'assign' | 'move' | 'remove' = 'assign') {
    return this.audienceListService.bulkAssignAudienceList(companyId, contactCaptureIds, audienceListId, action);
  }

  async updateLeadStatus(userCompanyId: string, profileId: string, status: string) {
    return this.pipelineService.updateLeadStatus(userCompanyId, profileId, status);
  }

  async updateLeadTags(userCompanyId: string, profileId: string, tags: string[]) {
    return this.pipelineService.updateLeadTags(userCompanyId, profileId, tags);
  }

  async getPipelineConfig(userCompanyId: string) {
    return this.pipelineService.getPipelineConfig(userCompanyId);
  }

  async updatePipelineConfig(
    userCompanyId: string,
    data: {
      customStatuses?: string[];
      customTags?: string[];
      },
  ) {
    return this.pipelineService.updatePipelineConfig(userCompanyId, data);
  }
}

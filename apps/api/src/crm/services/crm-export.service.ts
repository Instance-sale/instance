import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailListQueryDto } from '../dto/email-list-query.dto';
import { LeadQueryDto } from '../dto/lead-query.dto';

@Injectable()
export class CrmExportService {
  constructor(private readonly prisma: PrismaService) {}

  async getEmailList(companyId: string, query: EmailListQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const offset = (page - 1) * limit;

    const companyAccounts = await this.prisma.instagramAccount.findMany({
      where: { companyId },
      select: { id: true },
    });
    const accountIds = companyAccounts.map((a) => a.id);

    if (accountIds.length === 0) {
      return {
        contacts: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 1,
          hasMore: false,
        },
      };
    }

    // 1. Self-healing: Ensure any profile with captured email or phone for this company is synced into ContactCapture
    try {
      const profilesWithContact = await this.prisma.instagramUserProfile.findMany({
        where: {
          instagramAccountId: { in: accountIds },
          OR: [
            { email: { not: null } },
            { phone: { not: null } },
          ],
        },
      });

      for (const p of profilesWithContact) {
        if (!p.email && !p.phone) continue;
        const existing = await this.prisma.contactCapture.findUnique({
          where: {
            instagramAccountId_instagramUserId: {
              instagramAccountId: p.instagramAccountId,
              instagramUserId: p.instagramUserId,
            },
          },
        });

        const existingEmails = Array.isArray(existing?.emails) ? (existing.emails as string[]) : [];
        const existingPhones = Array.isArray(existing?.phoneNumbers) ? (existing.phoneNumbers as string[]) : [];
        const emails = p.email ? Array.from(new Set([...existingEmails, p.email])) : existingEmails;
        const phones = p.phone ? Array.from(new Set([...existingPhones, p.phone])) : existingPhones;

        if (!existing || emails.length !== existingEmails.length || phones.length !== existingPhones.length) {
          await this.prisma.contactCapture.upsert({
            where: {
              instagramAccountId_instagramUserId: {
                instagramAccountId: p.instagramAccountId,
                instagramUserId: p.instagramUserId,
              },
            },
            create: {
              instagramAccountId: p.instagramAccountId,
              instagramUserId: p.instagramUserId,
              username: p.username || null,
              emails,
              phoneNumbers: phones,
            },
            update: {
              username: p.username || undefined,
              emails,
              phoneNumbers: phones,
            },
          });
        }
      }
    } catch {
      // Don't fail the query if sync encounters a transient error
    }

    // 2. Build where filter for captured contacts strictly scoped to company accounts
    const whereClause: any = {
      instagramAccountId: { in: accountIds },
    };

    if (query.audienceListId && query.audienceListId !== 'all') {
      whereClause.AND = [
        {
          OR: [
            { audienceListMembers: { some: { audienceListId: query.audienceListId, audienceList: { companyId } } } },
            { targetAudienceListId: query.audienceListId },
          ],
        },
      ];
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      const searchCondition = {
        OR: [
          { username: { contains: term, mode: 'insensitive' } },
          { instagramUserId: { contains: term } },
        ],
      };
      if (whereClause.AND) {
        whereClause.AND.push(searchCondition);
      } else {
        whereClause.AND = [searchCondition];
      }
    }

    // Determine sort order
    let orderByClause: any = { updatedAt: 'desc' };
    if (query.sortBy === 'username') {
      orderByClause = { username: query.sortOrder || 'asc' };
    } else if (query.sortBy === 'createdAt') {
      orderByClause = { createdAt: query.sortOrder || 'desc' };
    }

    // 3. Query captured contacts with audience list members
    const [captures, total] = await Promise.all([
      this.prisma.contactCapture.findMany({
        where: whereClause,
        include: {
          audienceListMembers: {
            where: {
              audienceList: { companyId },
            },
            include: {
              audienceList: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  isPinned: true,
                },
              },
            },
          },
        },
        orderBy: orderByClause,
        take: limit,
        skip: offset,
      }),
      this.prisma.contactCapture.count({ where: whereClause }),
    ]);

    // 4. Resolve automation and folder for each captured user
    const userIds = captures.map((c) => c.instagramUserId);
    const executions = await this.prisma.automationExecution.findMany({
      where: {
        instagramUserId: { in: userIds },
        automation: {
          folder: {
            instagramAccountId: { in: accountIds },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      include: {
        automation: {
          include: {
            folder: true,
          },
        },
      },
    });

    const executionMap = new Map<string, (typeof executions)[number]>();
    for (const ex of executions) {
      if (!executionMap.has(ex.instagramUserId)) {
        executionMap.set(ex.instagramUserId, ex);
      }
    }

    let contacts = captures.map((c) => {
      const emails = Array.isArray(c.emails) ? (c.emails as string[]) : [];
      const phones = Array.isArray(c.phoneNumbers) ? (c.phoneNumbers as string[]) : [];
      const latestExec = executionMap.get(c.instagramUserId);

      const automationName = latestExec?.automation?.name ?? null;
      const folderName = latestExec?.automation?.folder?.name ?? null;

      // Format: "folder - automation name"
      const source = folderName && automationName
        ? `${folderName} - ${automationName}`
        : automationName || folderName || null;

      const audienceLists = (c as any).audienceListMembers?.map((m: any) => ({
        id: m.audienceList.id,
        name: m.audienceList.name,
        color: m.audienceList.color,
        isPinned: m.audienceList.isPinned,
      })) || [];

      return {
        id: c.id,
        username: c.username,
        instagramAccountId: c.instagramAccountId,
        instagramUserId: c.instagramUserId,
        emails,
        phoneNumbers: phones,
        primaryEmail: emails[0] ?? null,
        primaryPhone: phones[0] ?? null,
        folderName,
        automationName,
        source,
        audienceLists,
        primaryAudienceList: audienceLists[0] || null,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
      };
    });

    // In-memory filter for communication channel if requested
    if (query.channelFilter && query.channelFilter !== 'all') {
      if (query.channelFilter === 'email') {
        contacts = contacts.filter((c) => c.emails.length > 0);
      } else if (query.channelFilter === 'phone') {
        contacts = contacts.filter((c) => c.phoneNumbers.length > 0);
      } else if (query.channelFilter === 'both') {
        contacts = contacts.filter((c) => c.emails.length > 0 && c.phoneNumbers.length > 0);
      }
    }

    return {
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: offset + contacts.length < total,
      },
    };
  }

  buildWhereClause(instagramAccountId: string, query: LeadQueryDto): any {
    const andConditions: any[] = [{ instagramAccountId }];

    if (query.search) {
      const cleanTag = query.search.replace(/^#/, '').trim();
      andConditions.push({
        OR: [
          { username: { contains: query.search, mode: 'insensitive' } },
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { biography: { contains: query.search, mode: 'insensitive' } },
          { category: { contains: query.search, mode: 'insensitive' } },
          { tags: { array_contains: cleanTag } },
        ],
      });
    }

    if (query.interactionType === 'STORY') {
      andConditions.push({
        firstInteractionType: { in: ['STORY', 'STORY_REPLY', 'STORY_MENTION'] },
      });
    } else if (query.interactionType && query.interactionType !== 'all') {
      andConditions.push({ firstInteractionType: query.interactionType });
    }

    if (query.status && query.status !== 'all') {
      if (query.isDefaultStatus === 'true') {
        andConditions.push({
          OR: [
            { status: query.status },
            { status: null },
            { status: '' },
          ],
        });
      } else {
        andConditions.push({ status: query.status });
      }
    }

    if (query.hasWebsite === 'true') {
      andConditions.push({ website: { not: null } });
    } else if (query.hasWebsite === 'false') {
      andConditions.push({ website: null });
    }

    if (query.isVerified !== undefined) {
      andConditions.push({ isVerified: query.isVerified === 'true' });
    }

    if (query.isBusinessAccount !== undefined) {
      andConditions.push({ isBusinessAccount: query.isBusinessAccount === 'true' });
    }

    return { AND: andConditions };
  }

  getExportFieldDefinitions(): {
    key: string;
    aliases: string[];
    header: string;
    xmlTag: string;
    getValue: (lead: any) => string;
  }[] {
    return [
      {
        key: 'id',
        aliases: ['leadId'],
        header: 'ID',
        xmlTag: 'id',
        getValue: (l) => l.id || '',
      },
      {
        key: 'instagramUserId',
        aliases: ['igUserId'],
        header: 'Instagram User ID',
        xmlTag: 'instagramUserId',
        getValue: (l) => l.instagramUserId || '',
      },
      {
        key: 'username',
        aliases: ['handle'],
        header: 'Username',
        xmlTag: 'username',
        getValue: (l) => l.username || '',
      },
      {
        key: 'fullName',
        aliases: ['name'],
        header: 'Full Name',
        xmlTag: 'fullName',
        getValue: (l) => l.fullName || '',
      },
      {
        key: 'biography',
        aliases: ['bio'],
        header: 'Biography',
        xmlTag: 'biography',
        getValue: (l) => l.biography || '',
      },
      {
        key: 'website',
        aliases: ['link', 'url'],
        header: 'Website',
        xmlTag: 'website',
        getValue: (l) => l.website || '',
      },
      {
        key: 'email',
        aliases: ['leadEmail'],
        header: 'Profile Email',
        xmlTag: 'email',
        getValue: (l) => l.email || '',
      },
      {
        key: 'phone',
        aliases: ['phoneNumber'],
        header: 'Profile Phone',
        xmlTag: 'phone',
        getValue: (l) => l.phone || '',
      },
      {
        key: 'emails',
        aliases: ['capturedEmails', 'allEmails'],
        header: 'Captured Emails',
        xmlTag: 'capturedEmails',
        getValue: (l) => (Array.isArray(l.emails) ? l.emails.join('; ') : (l.email || '')),
      },
      {
        key: 'phoneNumbers',
        aliases: ['capturedPhones', 'allPhones'],
        header: 'Captured Phone Numbers',
        xmlTag: 'capturedPhoneNumbers',
        getValue: (l) => (Array.isArray(l.phoneNumbers) ? l.phoneNumbers.join('; ') : (l.phone || '')),
      },
      {
        key: 'followersCount',
        aliases: ['followers'],
        header: 'Followers Count',
        xmlTag: 'followersCount',
        getValue: (l) => (l.followersCount !== null && l.followersCount !== undefined ? String(l.followersCount) : ''),
      },
      {
        key: 'followingCount',
        aliases: ['following'],
        header: 'Following Count',
        xmlTag: 'followingCount',
        getValue: (l) => (l.followingCount !== null && l.followingCount !== undefined ? String(l.followingCount) : ''),
      },
      {
        key: 'mediaCount',
        aliases: ['posts', 'postCount'],
        header: 'Media Count',
        xmlTag: 'mediaCount',
        getValue: (l) => (l.mediaCount !== null && l.mediaCount !== undefined ? String(l.mediaCount) : ''),
      },
      {
        key: 'isVerified',
        aliases: ['verified', 'blueCheck'],
        header: 'Is Verified',
        xmlTag: 'isVerified',
        getValue: (l) => (l.isVerified ? 'Yes' : 'No'),
      },
      {
        key: 'isBusinessAccount',
        aliases: ['isBusiness'],
        header: 'Is Business Account',
        xmlTag: 'isBusinessAccount',
        getValue: (l) => (l.isBusinessAccount ? 'Yes' : 'No'),
      },
      {
        key: 'accountType',
        aliases: ['type'],
        header: 'Account Type',
        xmlTag: 'accountType',
        getValue: (l) => l.accountType || '',
      },
      {
        key: 'category',
        aliases: ['businessCategory'],
        header: 'Category',
        xmlTag: 'category',
        getValue: (l) => l.category || '',
      },
      {
        key: 'gender',
        aliases: [],
        header: 'Gender',
        xmlTag: 'gender',
        getValue: (l) => l.gender || '',
      },
      {
        key: 'status',
        aliases: ['leadStatus'],
        header: 'Status',
        xmlTag: 'status',
        getValue: (l) => l.status || '',
      },
      {
        key: 'tags',
        aliases: ['labels'],
        header: 'Tags',
        xmlTag: 'tags',
        getValue: (l) => (Array.isArray(l.tags) ? l.tags.join('; ') : ''),
      },
      {
        key: 'firstInteractionType',
        aliases: ['entryType'],
        header: 'First Interaction Type',
        xmlTag: 'firstInteractionType',
        getValue: (l) => l.firstInteractionType || '',
      },
      {
        key: 'firstInteractionAt',
        aliases: ['entryAt'],
        header: 'First Interaction At',
        xmlTag: 'firstInteractionAt',
        getValue: (l) => (l.firstInteractionAt ? new Date(l.firstInteractionAt).toISOString() : ''),
      },
      {
        key: 'originAutomation',
        aliases: ['automation', 'automationName'],
        header: 'Origin Automation',
        xmlTag: 'originAutomation',
        getValue: (l) => l.originAutomation?.automationName || '',
      },
      {
        key: 'originFolder',
        aliases: ['folder', 'folderName'],
        header: 'Origin Folder',
        xmlTag: 'originFolder',
        getValue: (l) => l.originAutomation?.folderName || '',
      },
      {
        key: 'audienceList',
        aliases: ['audienceListName', 'list'],
        header: 'Audience List',
        xmlTag: 'audienceList',
        getValue: (l) => l.audienceList?.name || '',
      },

      {
        key: 'createdAt',
        aliases: ['discoveredAt'],
        header: 'Created At',
        xmlTag: 'createdAt',
        getValue: (l) => (l.createdAt ? new Date(l.createdAt).toISOString() : ''),
      },
      {
        key: 'updatedAt',
        aliases: ['lastModifiedAt'],
        header: 'Updated At',
        xmlTag: 'updatedAt',
        getValue: (l) => (l.updatedAt ? new Date(l.updatedAt).toISOString() : ''),
      },
    ];
  }

  resolveActiveFields(fieldList?: string[]) {
    const allDefs = this.getExportFieldDefinitions();
    if (!fieldList || fieldList.length === 0) {
      // Default 12 columns
      const defaultKeys = [
        'id',
        'instagramUserId',
        'username',
        'fullName',
        'biography',
        'website',
        'firstInteractionType',
        'firstInteractionAt',
        'createdAt',
        'updatedAt',
      ];
      return allDefs.filter((d) => defaultKeys.includes(d.key));
    }

    const requested = fieldList.map((f) => f.toLowerCase().trim());
    return allDefs.filter(
      (d) => requested.includes(d.key.toLowerCase()) || d.aliases.some((a) => requested.includes(a.toLowerCase())),
    );
  }

  exportAsCSV(leads: any[], fieldList?: string[]): string {
    const activeFields = this.resolveActiveFields(fieldList);
    const headers = activeFields.map((f) => f.header);
    const rows = leads.map((lead) =>
      activeFields.map((f) => this.escapeCSV(f.getValue(lead))).join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }

  exportAsXML(leads: any[], fieldList?: string[]): string {
    const activeFields = this.resolveActiveFields(fieldList);
    const leadElements = leads
      .map((lead) => {
        const fieldTags = activeFields
          .map((f) => `      <${f.xmlTag}>${this.escapeXML(f.getValue(lead))}</${f.xmlTag}>`)
          .join('\n');
        return `    <lead>\n${fieldTags}\n    </lead>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<leads exportedAt="${new Date().toISOString()}" count="${leads.length}">
${leadElements}
</leads>`;
  }

  escapeCSV(value: string | null | undefined): string {
    if (value === null || value === undefined) return '';
    let str = String(value);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  escapeXML(value: string | null | undefined): string {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

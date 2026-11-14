import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CrmAudienceListService {
  constructor(private readonly prisma: PrismaService) {}

  async getAudienceLists(companyId: string) {
    if (!companyId) return [];

    const lists = await this.prisma.audienceList.findMany({
      where: { companyId },
      orderBy: [
        { isPinned: 'desc' },
        { pinnedOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        members: {
          include: {
            contactCapture: {
              select: {
                id: true,
                emails: true,
                phoneNumbers: true,
              },
            },
          },
        },
      },
    });

    return lists.map((list) => {
      const totalContacts = list.members.length;
      let emailCount = 0;
      let phoneCount = 0;
      for (const m of list.members) {
        const c = m.contactCapture;
        if (Array.isArray(c?.emails) && (c.emails as string[]).length > 0) {
          emailCount++;
        }
        if (Array.isArray(c?.phoneNumbers) && (c.phoneNumbers as string[]).length > 0) {
          phoneCount++;
        }
      }

      return {
        id: list.id,
        companyId: list.companyId,
        name: list.name,
        description: list.description,
        color: list.color,
        isPinned: list.isPinned,
        pinnedOrder: list.pinnedOrder,
        totalContacts,
        emailCount,
        phoneCount,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
      };
    });
  }

  async createAudienceList(companyId: string, data: { name: string; description?: string; color?: string; isPinned?: boolean }) {
    if (!companyId) {
      throw new BadRequestException('companyId is required');
    }

    const created = await this.prisma.audienceList.create({
      data: {
        companyId,
        name: data.name,
        description: data.description || null,
        color: data.color || 'blue',
        isPinned: Boolean(data.isPinned),
      },
    });

    return created;
  }

  async updateAudienceList(companyId: string, listId: string, data: { name?: string; description?: string; color?: string; isPinned?: boolean; pinnedOrder?: number }) {
    const existing = await this.prisma.audienceList.findFirst({
      where: { id: listId, companyId },
    });
    if (!existing) {
      throw new NotFoundException('Audience list not found or access denied');
    }

    const updated = await this.prisma.audienceList.update({
      where: { id: listId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color && { color: data.color }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
        ...(data.pinnedOrder !== undefined && { pinnedOrder: data.pinnedOrder }),
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  async deleteAudienceList(companyId: string, listId: string) {
    const existing = await this.prisma.audienceList.findFirst({
      where: { id: listId, companyId },
    });
    if (!existing) {
      throw new NotFoundException('Audience list not found or access denied');
    }

    await this.prisma.audienceList.delete({
      where: { id: listId },
    });

    return { success: true };
  }

  async togglePinAudienceList(companyId: string, listId: string) {
    const list = await this.prisma.audienceList.findFirst({
      where: { id: listId, companyId },
    });
    if (!list) throw new NotFoundException('Audience list not found or access denied');

    const updated = await this.prisma.audienceList.update({
      where: { id: listId },
      data: {
        isPinned: !list.isPinned,
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  async reassignContactAudienceList(companyId: string, contactCaptureId: string, audienceListId: string, action: 'assign' | 'unassign' | 'set' = 'set') {
    const list = await this.prisma.audienceList.findFirst({
      where: { id: audienceListId, companyId },
    });
    if (!list) throw new NotFoundException('Audience list not found or access denied');

    const contact = await this.prisma.contactCapture.findUnique({
      where: { id: contactCaptureId },
    });
    if (!contact) throw new NotFoundException('Contact not found or access denied');

    const account = await this.prisma.instagramAccount.findFirst({
      where: { id: contact.instagramAccountId, companyId },
      select: { id: true },
    });
    if (!account) throw new NotFoundException('Contact not found or access denied');

    if (action === 'set') {
      await this.prisma.audienceListMember.deleteMany({
        where: { contactCaptureId },
      });
      await this.prisma.audienceListMember.create({
        data: {
          audienceListId,
          contactCaptureId,
        },
      });
      await this.prisma.contactCapture.update({
        where: { id: contactCaptureId },
        data: { targetAudienceListId: audienceListId },
      });
    } else if (action === 'assign') {
      await this.prisma.audienceListMember.upsert({
        where: {
          audienceListId_contactCaptureId: {
            audienceListId,
            contactCaptureId,
          },
        },
        create: {
          audienceListId,
          contactCaptureId,
        },
        update: {},
      });
    } else if (action === 'unassign') {
      await this.prisma.audienceListMember.deleteMany({
        where: {
          audienceListId,
          contactCaptureId,
        },
      });
    }

    return { success: true };
  }

  async bulkAssignAudienceList(companyId: string, contactCaptureIds: string[], audienceListId: string, action: 'assign' | 'move' | 'remove' = 'assign') {
    if (!Array.isArray(contactCaptureIds) || contactCaptureIds.length === 0) {
      return { count: 0 };
    }

    const list = await this.prisma.audienceList.findFirst({
      where: { id: audienceListId, companyId },
    });
    if (!list) throw new NotFoundException('Audience list not found or access denied');

    const companyAccounts = await this.prisma.instagramAccount.findMany({
      where: { companyId },
      select: { id: true },
    });
    const accountIds = companyAccounts.map((a) => a.id);

    const validContacts = await this.prisma.contactCapture.findMany({
      where: {
        id: { in: contactCaptureIds },
        instagramAccountId: { in: accountIds },
      },
      select: { id: true },
    });
    const validContactIds = validContacts.map((c) => c.id);

    if (validContactIds.length === 0) {
      return { count: 0 };
    }

    if (action === 'move') {
      await this.prisma.audienceListMember.deleteMany({
        where: { contactCaptureId: { in: validContactIds } },
      });
    }

    if (action === 'remove') {
      const res = await this.prisma.audienceListMember.deleteMany({
        where: {
          audienceListId,
          contactCaptureId: { in: validContactIds },
        },
      });
      return { count: res.count };
    }

    let count = 0;
    for (const cId of validContactIds) {
      try {
        await this.prisma.audienceListMember.upsert({
          where: {
            audienceListId_contactCaptureId: {
              audienceListId,
              contactCaptureId: cId,
            },
          },
          create: {
            audienceListId,
            contactCaptureId: cId,
          },
          update: {},
        });
        count++;
      } catch {
        // ignore duplicate
      }
    }

    return { count };
  }
}


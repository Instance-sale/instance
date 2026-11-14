import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
  CreateFolderDto,
  ExecuteAutomationDto,
} from './dto/automations.dto';

const INSTAGRAM_GRAPH_API_BASE =
  process.env.INSTAGRAM_BASE_URL || 'https://graph.instagram.com/v24.0';

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private readonly prisma: PrismaService,
      ) { }

  async getFolders(userCompanyId: string, instagramAccountId: string) {
    if (!userCompanyId) throw new ForbiddenException('User has no company assigned');
    if (!instagramAccountId) throw new BadRequestException('instagramAccountId required');

    const account = await this.prisma.instagramAccount.findFirst({
      where: { id: instagramAccountId, companyId: userCompanyId },
    });
    if (!account) throw new NotFoundException('Instagram account not found');

    const folders = await this.prisma.automationFolder.findMany({
      where: { instagramAccountId, parentId: null },
      include: {
        children: true,
        _count: { select: { automations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { folders };
  }

  async createFolder(userCompanyId: string, dto: CreateFolderDto) {
    if (!userCompanyId) throw new ForbiddenException('User has no company assigned');

    const account = await this.prisma.instagramAccount.findFirst({
      where: { id: dto.instagramAccountId, companyId: userCompanyId },
    });
    if (!account) throw new NotFoundException('Instagram account not found');

    const folder = await this.prisma.automationFolder.create({
      data: {
        instagramAccountId: dto.instagramAccountId,
        name: dto.name,
        description: dto.description || null,
        color: dto.color || null,
        parentId: dto.parentId || null,
      },
    });

    return { folder };
  }

  async deleteFolder(userCompanyId: string, folderId: string) {
    if (!userCompanyId) throw new ForbiddenException('User has no company assigned');
    if (!folderId) throw new BadRequestException('folderId required');

    const folder = await this.prisma.automationFolder.findFirst({
      where: {
        id: folderId,
        instagramAccount: { companyId: userCompanyId },
      },
      include: {
        children: true,
      },
    });
    if (!folder) throw new NotFoundException('Folder not found');

    // Collect all folder IDs recursively (the folder itself and all descendant folders)
    const folderIdsToDelete: string[] = [folderId];
    const findChildrenRecursive = async (parentIds: string[]) => {
      const children = await this.prisma.automationFolder.findMany({
        where: { parentId: { in: parentIds } },
        select: { id: true },
      });
      if (children.length > 0) {
        const childIds = children.map((c) => c.id);
        folderIdsToDelete.push(...childIds);
        await findChildrenRecursive(childIds);
      }
    };
    await findChildrenRecursive([folderId]);

    // Delete in transaction to guarantee complete cascade deletion:
    // 1. Delete all ExecutionSteps for executions of automations in these folders
    // 2. Delete all AutomationExecutions
    // 3. Delete all AutomationNodes
    // 4. Delete all Automations
    // 5. Delete all folders
    await this.prisma.$transaction(async (tx) => {
      const automations = await tx.automation.findMany({
        where: { folderId: { in: folderIdsToDelete } },
        select: { id: true },
      });
      const automationIds = automations.map((a) => a.id);

      if (automationIds.length > 0) {
        const executions = await tx.automationExecution.findMany({
          where: { automationId: { in: automationIds } },
          select: { id: true },
        });
        const executionIds = executions.map((e) => e.id);

        if (executionIds.length > 0) {
          await tx.executionStep.deleteMany({
            where: { executionId: { in: executionIds } },
          });
          await tx.automationExecution.deleteMany({
            where: { id: { in: executionIds } },
          });
        }

        await tx.automationNode.deleteMany({
          where: { automationId: { in: automationIds } },
        });

        await tx.automation.deleteMany({
          where: { id: { in: automationIds } },
        });
      }

      await tx.automationFolder.deleteMany({
        where: { id: { in: folderIdsToDelete } },
      });
    });

    return { success: true, deletedFolderIds: folderIdsToDelete };
  }


  async getAutomations(userCompanyId: string, folderId?: string, instagramAccountId?: string) {
    if (!userCompanyId) throw new ForbiddenException('User has no company assigned');

    const whereClause: any = {};
    if (folderId) {
      const folder = await this.prisma.automationFolder.findFirst({
        where: {
          id: folderId,
          instagramAccount: { companyId: userCompanyId },
        },
      });
      if (!folder) throw new NotFoundException('Folder not found');
      whereClause.folderId = folderId;
    } else if (instagramAccountId) {
      const account = await this.prisma.instagramAccount.findFirst({
        where: {
          id: instagramAccountId,
          companyId: userCompanyId,
        },
      });
      if (!account) throw new NotFoundException('Instagram account not found');
      whereClause.folder = { instagramAccountId };
    } else {
      // Default: load all automations across company's instagram accounts
      whereClause.folder = {
        instagramAccount: { companyId: userCompanyId },
      };
    }

    const automations = await this.prisma.automation.findMany({
      where: whereClause,
      include: {
        nodes: true,
        _count: { select: { executions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { automations };
  }

  async createAutomation(userCompanyId: string, dto: CreateAutomationDto) {
    if (!userCompanyId) throw new ForbiddenException('User has no company assigned');

    const folder = await this.prisma.automationFolder.findFirst({
      where: {
        id: dto.folderId,
        instagramAccount: { companyId: userCompanyId },
      },
    });
    if (!folder) throw new NotFoundException('Folder not found');

    const automation = await this.prisma.automation.create({
      data: {
        folderId: dto.folderId,
        name: dto.name,
        description: dto.description || null,
        triggerType: dto.triggerType as any,
        mediaId: dto.mediaId || null,
        mediaType: dto.mediaType || null,
        triggerKeywords: dto.triggerKeywords || [],
        triggerMatchType: dto.triggerMatchType || null,
        isActive: false,
      },
    });

    if (dto.nodes && Array.isArray(dto.nodes) && dto.nodes.length > 0) {
      await Promise.all(
        dto.nodes.map((node: any, index: number) => {
          const nodeId =
            node.nodeId ||
            node.id ||
            `node_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`;

          return this.prisma.automationNode.create({
            data: {
              automationId: automation.id,
              nodeId,
              type: node.type,
              position: node.position || { x: 0, y: 0 },
              config: node.config || {},
              nextNodeIds: Array.isArray(node.nextNodeIds) ? node.nextNodeIds : [],
            },
          });
        }),
      );
    }

    const fullAutomation = await this.prisma.automation.findUnique({
      where: { id: automation.id },
      include: { nodes: true },
    });

    return { automation: fullAutomation };
  }

  private calculateFlowCoordinates(nodes: any[]): any[] {
    if (!Array.isArray(nodes) || nodes.length === 0) return [];

    const nodeMap = new Map<string, any>();
    nodes.forEach((n, idx) => {
      const id = n.nodeId || n.id || `node_${idx + 1}`;
      nodeMap.set(id, { ...n, nodeId: id });
    });

    const incomingCount = new Map<string, number>();
    nodes.forEach((n) => {
      const nextIds = Array.isArray(n.nextNodeIds) ? n.nextNodeIds : [];
      nextIds.forEach((targetId: string) => {
        incomingCount.set(targetId, (incomingCount.get(targetId) || 0) + 1);
      });
    });

    let root = nodes.find((n) => (n.type || '').startsWith('TRIGGER_'));
    if (!root) {
      root = nodes.find((n) => !incomingCount.has(n.nodeId || n.id));
    }
    if (!root) {
      root = nodes[0];
    }

    const rootId = root.nodeId || root.id;
    const levels = new Map<string, number>();
    const levelNodes = new Map<number, string[]>();

    const queue: { id: string; level: number }[] = [{ id: rootId, level: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      levels.set(id, level);
      if (!levelNodes.has(level)) levelNodes.set(level, []);
      levelNodes.get(level)!.push(id);

      const nodeObj = nodeMap.get(id);
      if (nodeObj) {
        const nextIds = Array.isArray(nodeObj.nextNodeIds) ? nodeObj.nextNodeIds : [];
        nextIds.forEach((targetId: string) => {
          if (!visited.has(targetId) && nodeMap.has(targetId)) {
            queue.push({ id: targetId, level: level + 1 });
          }
        });
      }
    }

    let maxLevel = Array.from(levels.values()).reduce((max, lvl) => Math.max(max, lvl), 0);
    nodes.forEach((n) => {
      const id = n.nodeId || n.id;
      if (!visited.has(id)) {
        maxLevel += 1;
        levels.set(id, maxLevel);
        if (!levelNodes.has(maxLevel)) levelNodes.set(maxLevel, []);
        levelNodes.get(maxLevel)!.push(id);
      }
    });

    const result: any[] = [];
    levelNodes.forEach((nodeIdsInLevel, level) => {
      const x = 100 + level * 360;
      const count = nodeIdsInLevel.length;

      nodeIdsInLevel.forEach((id, index) => {
        const node = nodeMap.get(id);
        let y = 220;
        if (count > 1) {
          const spacing = 180;
          const startY = 220 - ((count - 1) * spacing) / 2;
          y = startY + index * spacing;
        }

        result.push({
          ...node,
          position: { x: Math.round(x), y: Math.round(y) },
        });
      });
    });

    return result;
  }

  async getAutomation(userCompanyId: string, id: string) {
    if (!userCompanyId) throw new ForbiddenException('User has no company assigned');

    const automation = await this.prisma.automation.findFirst({
      where: {
        id,
        folder: { instagramAccount: { companyId: userCompanyId } },
      },
      include: {
        nodes: { orderBy: { createdAt: 'asc' } },
        folder: { include: { instagramAccount: true } },
      },
    });

    if (!automation) throw new NotFoundException('Automation not found');
    return { automation };
  }

  async updateAutomation(userCompanyId: string, id: string, dto: UpdateAutomationDto) {
    if (!userCompanyId) throw new ForbiddenException('User has no company assigned');

    const automation = await this.prisma.automation.findFirst({
      where: {
        id,
        folder: { instagramAccount: { companyId: userCompanyId } },
      },
    });
    if (!automation) throw new NotFoundException('Automation not found');

    const updateData: any = {
      ...(dto.name && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.flowData !== undefined && { flowData: dto.flowData }),
      ...(dto.triggerKeywords !== undefined && { triggerKeywords: dto.triggerKeywords }),
      ...(dto.triggerMatchType !== undefined && { triggerMatchType: dto.triggerMatchType }),
      ...(dto.mediaId !== undefined && { mediaId: dto.mediaId }),
      ...(dto.mediaType !== undefined && { mediaType: dto.mediaType }),
      ...(dto.triggerType !== undefined && { triggerType: dto.triggerType }),
    };

    if (dto.status !== undefined) {
      updateData.isActive = dto.status === 'LIVE';
    }

    const updated = await this.prisma.automation.update({
      where: { id },
      data: updateData,
    });

    return { automation: updated };
  }

  async deleteAutomation(userCompanyId: string, id: string) {
    if (!userCompanyId) throw new ForbiddenException('User has no company assigned');

    const automation = await this.prisma.automation.findFirst({
      where: {
        id,
        folder: { instagramAccount: { companyId: userCompanyId } },
      },
    });
    if (!automation) throw new NotFoundException('Automation not found');

    await this.prisma.$transaction(async (tx) => {
      const executions = await tx.automationExecution.findMany({
        where: { automationId: id },
        select: { id: true },
      });
      const executionIds = executions.map((e) => e.id);
      if (executionIds.length > 0) {
        await tx.executionStep.deleteMany({
          where: { executionId: { in: executionIds } },
        });
        await tx.automationExecution.deleteMany({
          where: { id: { in: executionIds } },
        });
      }
      await tx.automationNode.deleteMany({
        where: { automationId: id },
      });
      await tx.automation.delete({ where: { id } });
    });

    return { success: true };
  }

  async executeAutomation(userCompanyId: string, dto: ExecuteAutomationDto) {
    if (!userCompanyId) throw new ForbiddenException('User has no company assigned');

    const automation = await this.prisma.automation.findUnique({
      where: { id: dto.automationId },
      include: {
        folder: {
          select: {
            instagramAccount: {
              select: { id: true, companyId: true },
            },
          },
        },
      },
    });

    const account = automation?.folder?.instagramAccount;
    if (!automation || !account || account.companyId !== userCompanyId) {
      throw new NotFoundException('Automation not found');
    }

    // Record an execution
    const execution = await this.prisma.automationExecution.create({
      data: {
        automationId: dto.automationId,
        instagramUserId: dto.instagramUserId,
        status: 'COMPLETED',
        variables: dto.variables || {},
      },
    });

    return { success: true, executionId: execution.id };
  }

  async saveNodes(userCompanyId: string, id: string, nodes: any[]) {
    if (!userCompanyId) throw new ForbiddenException('User has no company assigned');

    const automation = await this.prisma.automation.findFirst({
      where: {
        id,
        folder: { instagramAccount: { companyId: userCompanyId } },
      },
    });
    if (!automation) throw new NotFoundException('Automation not found');

    const incomingNodes = Array.isArray(nodes) ? nodes : [];

    await this.prisma.$transaction(async (tx) => {
      await tx.automationNode.deleteMany({
        where: { automationId: id },
      });

      if (incomingNodes.length > 0) {
        await tx.automationNode.createMany({
          data: incomingNodes.map((node: any, index: number) => ({
            automationId: id,
            nodeId:
              node.nodeId ||
              node.id ||
              `node_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
            type: node.type,
            position: node.position || { x: 0, y: 0 },
            config: node.config || {},
            nextNodeIds: Array.isArray(node.nextNodeIds) ? node.nextNodeIds : [],
          })),
        });
      }
    });

    const savedNodes = await this.prisma.automationNode.findMany({
      where: { automationId: id },
      orderBy: { createdAt: 'asc' },
    });

    return { success: true, nodes: savedNodes };
  }

  async getAutomationStats(userCompanyId: string, id: string) {
    if (!userCompanyId) throw new ForbiddenException('User has no company assigned');

    const automation = await this.prisma.automation.findFirst({
      where: {
        id,
        folder: { instagramAccount: { companyId: userCompanyId } },
      },
    });
    if (!automation) throw new NotFoundException('Automation not found');

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalExecutions, successfulExecutions, failedExecutions, executions24h] =
      await Promise.all([
        this.prisma.automationExecution.count({
          where: { automationId: id },
        }),
        this.prisma.automationExecution.count({
          where: { automationId: id, status: 'COMPLETED' },
        }),
        this.prisma.automationExecution.count({
          where: { automationId: id, status: 'FAILED' },
        }),
        this.prisma.automationExecution.count({
          where: {
            automationId: id,
            startedAt: { gte: twentyFourHoursAgo },
          },
        }),
      ]);

    return {
      stats: {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        executions24h,
      },
    };
  }

  async getAutomationExecutions(
    userCompanyId: string,
    id: string,
    page: number = 1,
    limit: number = 50,
  ) {
    if (!userCompanyId) throw new ForbiddenException('User has no company assigned');

    const automation = await this.prisma.automation.findFirst({
      where: {
        id,
        folder: { instagramAccount: { companyId: userCompanyId } },
      },
      include: {
        folder: {
          include: {
            instagramAccount: true,
          },
        },
        nodes: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!automation) throw new NotFoundException('Automation not found');

    const offset = (page - 1) * limit;

    const [executions, total] = await Promise.all([
      this.prisma.automationExecution.findMany({
        where: { automationId: id },
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          steps: {
            orderBy: { executedAt: 'asc' },
          },
        },
      }),
      this.prisma.automationExecution.count({ where: { automationId: id } }),
    ]);

    const instagramUserIds = Array.from(
      new Set(executions.map((e) => e.instagramUserId).filter(Boolean)),
    );

    const profiles =
      instagramUserIds.length > 0
        ? await this.prisma.instagramUserProfile.findMany({
          where: {
            instagramAccountId: automation.folder.instagramAccountId,
            instagramUserId: { in: instagramUserIds },
          },
        })
        : [];
    const profileMap = new Map(profiles.map((p) => [p.instagramUserId, p]));

    const enrichedExecutions = executions.map((exec) => {
      const profile = profileMap.get(exec.instagramUserId);
      return {
        ...exec,
        userProfile: profile
          ? {
            username: profile.username,
            fullName: profile.fullName,
            profilePictureUrl: profile.profilePictureUrl,
          }
          : null,
      };
    });

    return {
      automation: {
        id: automation.id,
        name: automation.name,
        triggerType: automation.triggerType,
        isActive: automation.isActive,
        nodes: automation.nodes,
      },
      executions: enrichedExecutions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAutomationAnalytics(userCompanyId: string, id: string) {
    if (!userCompanyId) throw new ForbiddenException('User has no company assigned');

    const automation = await this.prisma.automation.findFirst({
      where: {
        id,
        folder: { instagramAccount: { companyId: userCompanyId } },
      },
      include: {
        folder: {
          include: {
            instagramAccount: true,
          },
        },
        nodes: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!automation) throw new NotFoundException('Automation not found');

    const [executions, executionSteps] = await Promise.all([
      this.prisma.automationExecution.findMany({
        where: { automationId: id },
        orderBy: { startedAt: 'desc' },
        take: 2000,
        select: {
          id: true,
          instagramUserId: true,
          status: true,
          currentNodeId: true,
          variables: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      this.prisma.executionStep.findMany({
        where: {
          execution: { automationId: id },
        },
        orderBy: { executedAt: 'asc' },
        take: 10000,
        select: {
          id: true,
          nodeId: true,
          status: true,
          output: true,
          executedAt: true,
        },
      }),
    ]);

    const totalTriggers = executions.length;
    const completedRuns = executions.filter((e) => e.status === 'COMPLETED').length;
    const failedRuns = executions.filter((e) => e.status === 'FAILED').length;
    const completionRate = totalTriggers > 0 ? Math.round((completedRuns / totalTriggers) * 1000) / 10 : 0;

    // Build map of ExecutionStep stats per nodeId
    const nodeStepMap: Record<
      string,
      {
        executedCount: number;
        successCount: number;
        failedCount: number;
        branches: Record<string, number>;
      }
    > = {};

    for (const step of executionSteps) {
      if (!nodeStepMap[step.nodeId]) {
        nodeStepMap[step.nodeId] = {
          executedCount: 0,
          successCount: 0,
          failedCount: 0,
          branches: {},
        };
      }
      nodeStepMap[step.nodeId].executedCount += 1;
      if (step.status === 'COMPLETED') {
        nodeStepMap[step.nodeId].successCount += 1;
      } else if (step.status === 'FAILED') {
        nodeStepMap[step.nodeId].failedCount += 1;
      }

      if (step.output && typeof step.output === 'object') {
        const out = step.output as any;
        const branchKey = out.branch || out.conditionResult !== undefined ? String(out.conditionResult) : null;
        if (branchKey) {
          nodeStepMap[step.nodeId].branches[branchKey] = (nodeStepMap[step.nodeId].branches[branchKey] || 0) + 1;
        }
      }
    }

    // Determine nodes list (from database nodes or flowData)
    const nodes = automation.nodes || [];
    const triggerNode = nodes.find((n) => n.type.startsWith('TRIGGER_')) || nodes[0];

    // Compute step-by-step funnel
    const funnelSteps: any[] = [];
    const nodeAnalytics: Record<string, any> = {};

    let previousCount = totalTriggers;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const isTrigger = node.type.startsWith('TRIGGER_');
      const stats = nodeStepMap[node.nodeId] || {
        executedCount: 0,
        successCount: 0,
        failedCount: 0,
        branches: {},
      };

      // For trigger node, default to total executions if no explicit execution step was recorded
      const executedCount = isTrigger ? Math.max(totalTriggers, stats.executedCount) : stats.executedCount;
      const funnelPercentage = totalTriggers > 0 ? Math.round((executedCount / totalTriggers) * 1000) / 10 : 0;
      const stepConversionRate = previousCount > 0 ? Math.round((executedCount / previousCount) * 1000) / 10 : (executedCount > 0 ? 100 : 0);
      const stepDropoffRate = Math.max(0, Math.round((100 - stepConversionRate) * 10) / 10);

      // Compute branch splits (e.g. Yes vs No for condition nodes)
      let branchSplits: any = undefined;
      const branchTotal = Object.values(stats.branches).reduce((a, b) => a + b, 0);
      if (branchTotal > 0 || node.type === 'ACTION_CONDITION') {
        const trueCount = stats.branches['true'] || stats.branches['yes'] || 0;
        const falseCount = stats.branches['false'] || stats.branches['no'] || 0;
        const countSum = trueCount + falseCount || executedCount;
        branchSplits = {
          true: {
            count: trueCount,
            percentage: countSum > 0 ? Math.round((trueCount / countSum) * 1000) / 10 : 0,
          },
          false: {
            count: falseCount,
            percentage: countSum > 0 ? Math.round((falseCount / countSum) * 1000) / 10 : 0,
          },
        };
      }

      const nodeData = {
        nodeId: node.nodeId,
        type: node.type,
        label: (node.config as any)?.name || (node.config as any)?.label || node.type.replace(/^ACTION_|^TRIGGER_|^FLOW_/, '').replace(/_/g, ' '),
        executedCount,
        successCount: isTrigger ? executedCount : stats.successCount,
        failedCount: stats.failedCount,
        funnelPercentage,
        stepConversionRate,
        stepDropoffRate,
        branchSplits,
      };

      nodeAnalytics[node.nodeId] = nodeData;
      funnelSteps.push(nodeData);

      if (executedCount > 0) {
        previousCount = executedCount;
      }
    }

    // Lead metrics and pipeline/tag distribution
    const participantIds = Array.from(new Set(executions.map((e) => e.instagramUserId).filter(Boolean)));
    const [profiles, conversations] = await Promise.all([
      participantIds.length > 0
        ? this.prisma.instagramUserProfile.findMany({
          where: {
            instagramAccountId: automation.folder.instagramAccountId,
            instagramUserId: { in: participantIds },
          },
          select: {
            instagramUserId: true,
            status: true,
            tags: true,          },
        })
        : [],
      Promise.resolve([]),
    ]);

    const leadsInFunnel = profiles.length;
    
    // Pipeline stage progression
    const stageCounts: Record<string, number> = {};
    for (const p of profiles) {
      const st = p.status || 'New';
      stageCounts[st] = (stageCounts[st] || 0) + 1;
    }
    const stageDistribution = Object.entries(stageCounts).map(([stage, count]) => ({
      stage,
      count,
      percentage: leadsInFunnel > 0 ? Math.round((count / leadsInFunnel) * 1000) / 10 : 0,
    })).sort((a, b) => b.count - a.count);

    // Tag distribution
    const tagCounts: Record<string, number> = {};
    for (const p of profiles) {
      if (Array.isArray(p.tags)) {
        for (const t of p.tags as string[]) {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        }
      }
    }
    const tagDistribution = Object.entries(tagCounts).map(([tag, count]) => ({
      tag,
      count,
    })).sort((a, b) => b.count - a.count);

    // Deals and closed revenue
    let dealsClosedCount = 0;
    let totalRevenue = 0;
    for (const conv of conversations) {
      const summary = (conv.engagementSummary as any) || {};
      if (summary.dealValue && Number(summary.dealValue) > 0) {
        dealsClosedCount += 1;
        totalRevenue += Number(summary.dealValue);
      }
    }

    const qualifiedLeads = 0;

    return {
      summary: {
        totalTriggers,
        completedRuns,
        completionRate,
        failedRuns,
        leadsInFunnel,
        qualifiedLeads,
        dealsClosedCount,
        totalRevenue,
      },
      nodeAnalytics,
      funnelSteps,
      stageDistribution,
      tagDistribution,
    };
  }

  async duplicateAutomation(userCompanyId: string, id: string) {
    if (!userCompanyId) throw new ForbiddenException('User has no company assigned');

    const automation = await this.prisma.automation.findFirst({
      where: {
        id,
        folder: { instagramAccount: { companyId: userCompanyId } },
      },
      include: {
        nodes: true,
      },
    });
    if (!automation) throw new NotFoundException('Automation not found');

    const newAutomation = await this.prisma.automation.create({
      data: {
        folderId: automation.folderId,
        name: `${automation.name} (Copy)`,
        description: automation.description,
        triggerType: automation.triggerType,
        mediaId: automation.mediaId,
        mediaType: automation.mediaType,
        triggerKeywords: automation.triggerKeywords,
        triggerMatchType: automation.triggerMatchType,
        flowData: automation.flowData,
        isActive: false,
        nodes: {
          create: automation.nodes.map((node) => ({
            nodeId: node.nodeId,
            type: node.type,
            position: node.position as any,
            config: node.config as any,
            nextNodeIds: node.nextNodeIds,
          })),
        },
      },
      include: {
        nodes: true,
      },
    });

    return { automation: newAutomation };
  }
}

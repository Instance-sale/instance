import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async createKey(companyId: string, name: string) {
    const randomHex = crypto.randomBytes(32).toString('hex');
    const rawKey = `inst_live_${randomHex}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const last4 = rawKey.slice(-4);
    const displayKey = `inst_live_••••••••${last4}`;

    const record = await this.prisma.apiKey.create({
      data: {
        companyId,
        name,
        keyPrefix: 'inst_live_',
        keyHash,
        displayKey,
      },
    });

    return {
      id: record.id,
      name: record.name,
      displayKey: record.displayKey,
      rawKey,
      createdAt: record.createdAt,
    };
  }

  async listKeys(companyId: string) {
    return this.prisma.apiKey.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        displayKey: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeKey(companyId: string, id: string) {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.delete({
      where: { id },
    });

    return { success: true, message: 'API key revoked successfully' };
  }

  async validateKey(rawKey: string): Promise<{ companyId: string; keyId: string; keyName: string }> {
    if (!rawKey || !rawKey.startsWith('inst_live_')) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Invalid API key format. Keys must start with inst_live_',
        code: 401,
      });
    }

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
    });

    if (!apiKey) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Invalid or revoked API key',
        code: 401,
      });
    }

    // Touch lastUsedAt asynchronously without blocking
    this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return {
      companyId: apiKey.companyId,
      keyId: apiKey.id,
      keyName: apiKey.name,
    };
  }
}

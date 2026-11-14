import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DebugService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestMagicLink(email: string): Promise<{ url: string | null }> {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const allowedEmail = (process.env.REVIEW_TEST_EMAIL || '').trim().toLowerCase();

    if (!trimmedEmail) {
      throw new BadRequestException('email required');
    }

    if (allowedEmail && trimmedEmail !== allowedEmail) {
      return { url: null };
    }

    const identifier = `reviewer_magic_link_url:${trimmedEmail}`;
    try {
      const row = await this.prisma.verificationToken.findFirst({
        where: {
          identifier,
          expires: { gt: new Date() },
        },
        orderBy: { expires: 'desc' },
        select: { token: true },
      });

      return { url: row?.token || null };
    } catch {
      return { url: null };
    }
  }
}

import { Injectable, NotFoundException, UnauthorizedException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const INSTAGRAM_GRAPH_API_BASE = process.env.INSTAGRAM_BASE_URL || 'https://graph.instagram.com/v24.0';

@Injectable()
export class InstagramMediaService {
  private readonly logger = new Logger(InstagramMediaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMedia(
    userId: string,
    accountId: string,
    type: 'post' | 'reel' | 'story' | 'all' = 'all',
    limit: number = 25,
    after?: string,
  ) {
    const instagramAccount = await this.prisma.instagramAccount.findFirst({
      where: {
        id: accountId,
        company: {
          users: {
            some: { id: userId },
          },
        },
      },
    });

    if (!instagramAccount) {
      throw new NotFoundException('Instagram account not found');
    }

    if (!instagramAccount.isActive || !instagramAccount.accessToken) {
      throw new UnauthorizedException(
        'Instagram session is expired or inactive. Please reconnect your account in Settings.',
      );
    }

    const isStory = type === 'story';
    // For stories, Meta Graph API only supports media fields without comments_count
    const fields = isStory
      ? 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp'
      : 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count';
    const edge = isStory ? 'stories' : 'media';
    let endpoint = `${INSTAGRAM_GRAPH_API_BASE}/${instagramAccount.instagramUserId}/${edge}?fields=${fields}&limit=${limit}`;
    if (after) endpoint += `&after=${after}`;

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${instagramAccount.accessToken}` },
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data.error?.message || 'Failed to fetch media from Instagram';
      const isTokenInvalidated =
        data.error?.code === 190 ||
        data.error?.error_subcode === 460 ||
        /access token|session has been invalidated|password/i.test(errorMsg);

      if (isTokenInvalidated) {
        this.logger.warn(
          `Instagram session invalidated for account ${instagramAccount.id}: ${errorMsg}`,
        );
        await this.prisma.instagramAccount
          .update({
            where: { id: instagramAccount.id },
            data: { isActive: false },
          })
          .catch((err) =>
            this.logger.warn(`Failed to set isActive=false: ${err.message}`),
          );

        throw new UnauthorizedException(
          'Error validating access token: The session has been invalidated because the user changed their password or Facebook has changed the session for security reasons. Please reconnect your Instagram account.',
        );
      }

      throw new InternalServerErrorException(errorMsg);
    }

    const mediaItems = Array.isArray(data.data) ? data.data : [];
    const mediaIds = mediaItems.map((m: any) => m.id).filter(Boolean);

    let matchingAutomations: Array<{
      id: string;
      name: string;
      mediaId: string | null;
      triggerType: string;
      isActive: boolean;
    }> = [];

    if (mediaIds.length > 0) {
      try {
        matchingAutomations = await this.prisma.automation.findMany({
          where: {
            folder: {
              instagramAccountId: instagramAccount.id,
            },
            mediaId: { in: mediaIds },
          },
          select: {
            id: true,
            name: true,
            mediaId: true,
            triggerType: true,
            isActive: true,
          },
        });
      } catch (dbErr: any) {
        this.logger.warn(`Failed to correlate media with automations: ${dbErr.message}`);
      }
    }

    const automationMap = new Map<string, (typeof matchingAutomations)[number]>();
    for (const auto of matchingAutomations) {
      if (auto.mediaId && !automationMap.has(auto.mediaId)) {
        automationMap.set(auto.mediaId, auto);
      }
    }

    const enrichedData = mediaItems.map((item: any) => {
      const auto = automationMap.get(item.id);
      return {
        ...item,
        isAutomated: Boolean(auto),
        automation: auto
          ? {
              id: auto.id,
              name: auto.name,
              triggerType: auto.triggerType,
              isActive: auto.isActive,
            }
          : null,
      };
    });

    return {
      data: enrichedData,
      paging: data.paging,
      cached: false,
    };
  }

  /**
   * Like an Instagram comment on behalf of the account (sends official Heart reaction)
   * Meta Endpoint: POST /{ig-user-id}/likes?comment_id={comment-id}
   */
  async likeInstagramComment(
    accessToken: string,
    instagramUserId: string,
    commentId: string,
  ): Promise<boolean> {
    try {
      const baseUrl = accessToken && accessToken.startsWith('IGA')
        ? (process.env.INSTAGRAM_BASE_URL || 'https://graph.instagram.com/v21.0')
        : (process.env.INSTAGRAM_GRAPH_API_BASE || 'https://graph.facebook.com/v21.0');

      const targetUser = instagramUserId || 'me';
      const url = `${baseUrl}/${targetUser}/likes?access_token=${encodeURIComponent(accessToken)}&comment_id=${encodeURIComponent(commentId)}`;
      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: commentId }),
      });
      let data = await res.json().catch(() => ({}));

      // Fallback: If /{targetUser}/likes failed and targetUser !== 'me', try /me/likes
      if ((!res.ok || data.error) && targetUser !== 'me') {
        const fallbackUrl = `${baseUrl}/me/likes?access_token=${encodeURIComponent(accessToken)}&comment_id=${encodeURIComponent(commentId)}`;
        const fbRes = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment_id: commentId }),
        });
        const fbData = await fbRes.json().catch(() => ({}));
        if (fbRes.ok && !fbData.error) {
          this.logger.log(`[AutoLike] Successfully auto-liked comment ${commentId} via fallback`);
          return true;
        }
      }

      if (!res.ok || data.error) {
        this.logger.warn(
          `[AutoLike] Meta like failed for comment ${commentId}: ${data.error?.message || res.statusText}`,
        );
        return false;
      }
      this.logger.log(`[AutoLike] Successfully auto-liked comment ${commentId}`);
      return true;
    } catch (err: any) {
      this.logger.warn(`[AutoLike] Error liking comment ${commentId}: ${err.message}`);
      return false;
    }
  }

  async getProfiles(
    userCompanyId: string | null,
    accountId: string,
    limit: number = 50,
    offset: number = 0,
      ) {
    if (!userCompanyId) {
      throw new NotFoundException('Company not found');
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

    const [profiles, total] = await Promise.all([
      this.prisma.instagramUserProfile.findMany({
        where: {
          instagramAccountId: accountId,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.instagramUserProfile.count({
        where: {
          instagramAccountId: accountId,
        },
      }),
    ]);

    return {
      profiles,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + profiles.length < total,
      },
    };
  }


  async getStoryMentions(
    companyId: string,
    accountId?: string,
    status?: string,
    limit: number = 50,
  ) {
    const where: any = {
      instagramAccount: { companyId },
    };
    if (accountId) {
      where.instagramAccountId = accountId;
    }
    if (status && status !== 'ALL') {
      where.repostStatus = status;
    }

    const mentions = await this.prisma.storyMention.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        instagramAccount: {
          select: { id: true, username: true, profilePictureUrl: true },
        },
      },
    });

    return { mentions, total: mentions.length };
  }

  /**
   * Feature 7: Update Story Mention Repost Status
   */
  async updateStoryMentionStatus(
    companyId: string,
    mentionId: string,
    repostStatus: string,
  ) {
    const mention = await this.prisma.storyMention.findFirst({
      where: {
        id: mentionId,
        instagramAccount: { companyId },
      },
    });
    if (!mention) {
      throw new NotFoundException('Story mention not found');
    }

    return this.prisma.storyMention.update({
      where: { id: mentionId },
      data: { repostStatus },
    });
  }

}

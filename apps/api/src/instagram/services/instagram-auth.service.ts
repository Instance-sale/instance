import { Injectable, InternalServerErrorException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const INSTAGRAM_GRAPH_API_BASE = process.env.INSTAGRAM_BASE_URL || 'https://graph.instagram.com/v24.0';

const GRAPH_API_BASE = process.env.INSTAGRAM_GRAPH_API_BASE || 'https://graph.facebook.com/v24.0';

function getGraphApiBase(token: string): string {
  if (token && (token.startsWith('IGAA') || token.startsWith('IGQ') || token.startsWith('AQ'))) {
    return 'https://graph.instagram.com/v24.0';
  }
  return 'https://graph.facebook.com/v24.0';
}

function generateCompanyId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 15; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}


@Injectable()
export class InstagramAuthService {
  private readonly logger = new Logger(InstagramAuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  getOAuthUrl(userId: string, setupMode?: string, origin?: string): string {
    const configId = process.env.INSTAGRAM_CONFIG_ID?.trim();
    const appId = (configId ? (process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID) : (process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID))?.trim();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin || 'http://localhost:3000';
    const redirectUri = (
      process.env.INSTAGRAM_REDIRECT_URI || `${baseUrl}/api/instagram/callback`
    ).trim();

    if (!appId) {
      throw new InternalServerErrorException(
        'Instagram App ID not configured. Please set INSTAGRAM_APP_ID or META_APP_ID in your .env file.',
      );
    }

    const state = setupMode === 'new' ? `${userId}:new` : userId;

    if (configId) {
      // Unified Login: uses Facebook Login for Business with Instagram assets configuration
      const authUrl = new URL('https://www.facebook.com/dialog/oauth');
      authUrl.searchParams.set('client_id', appId);
      authUrl.searchParams.set('config_id', configId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', state);
      return authUrl.toString();
    }

    const authUrl = new URL('https://api.instagram.com/oauth/authorize');
    authUrl.searchParams.set('client_id', appId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set(
      'scope',
      [
        'instagram_business_basic',
        'instagram_business_manage_messages',
        'instagram_business_manage_comments',
        'instagram_business_content_publish',
      ].join(','),
    );
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);

    return authUrl.toString();
  }

  async handleOAuthCallback(
    code: string,
    state: string,
    requestOrigin?: string,
    onAccountConnected?: (accountId: string, token: string) => Promise<void>,
  ): Promise<string> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin || 'http://localhost:3000';

    if (!code) {
      return `${baseUrl}/setup?error=no_code`;
    }

    if (!state) {
      return `${baseUrl}/setup?error=oauth_state_missing`;
    }

    const [userId, setupMode] = state.split(':');
    const isNewAccountSetup = setupMode === 'new';

    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user) {
      return `${baseUrl}/login`;
    }

    if (!user.company) {
      let candidateId = '';
      for (let i = 0; i < 10; i++) {
        const candidate = generateCompanyId();
        const existing = await this.prisma.company.findUnique({
          where: { companyId: candidate },
        });
        if (!existing) {
          candidateId = candidate;
          break;
        }
      }

      if (!candidateId) {
        throw new Error('Failed to generate unique company ID');
      }

      const defaultCompany = await this.prisma.company.create({
        data: {
          name: user.name || user.email?.split('@')[0] || 'My Company',
          companyId: candidateId,
          ownerId: userId,
        },
      });

      user = await this.prisma.user.update({
        where: { id: userId },
        data: { companyId: defaultCompany.id, role: 'OWNER' },
        include: { company: true },
      });
    }

    const configId = process.env.INSTAGRAM_CONFIG_ID?.trim();
    const appId = (configId ? (process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID) : (process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID))?.trim();
    const appSecret = (configId ? (process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET) : (process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET))?.trim();
    const redirectUri = (
      process.env.INSTAGRAM_REDIRECT_URI || `${baseUrl}/api/instagram/callback`
    ).trim();

    if (!appId || !appSecret) {
      return `${baseUrl}/setup?error=oauth_not_configured`;
    }

    let longLivedToken: string;
    let expiresAt: Date;
    let igInfo: any;
    let accountType: string | null = null;
    let webhookUserId: string | null = null;

    if (configId) {
      // Step 1 (Unified Login): Exchange code for System User token via Meta Graph API
      const tokenUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
      tokenUrl.searchParams.set('client_id', appId);
      tokenUrl.searchParams.set('client_secret', appSecret);
      tokenUrl.searchParams.set('redirect_uri', redirectUri);
      tokenUrl.searchParams.set('code', code);

      const tokenRes = await fetch(tokenUrl.toString());
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.access_token) {
        this.logger.error('Failed to exchange code for Unified Login token:', tokenData);
        return `${baseUrl}/setup?error=token_exchange_failed`;
      }

      longLivedToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in || 5184000;
      expiresAt = new Date(Date.now() + expiresIn * 1000);

      // Step 2 (Unified Login): Discover assigned Instagram account(s)
      let assignedData: any = null;
      // 1. Try assigned_instagram_accounts cleanly without modifier fields
      try {
        const assignedRes = await fetch(
          `${GRAPH_API_BASE}/me/assigned_instagram_accounts?access_token=${longLivedToken}`,
        );
        assignedData = await assignedRes.json();
        const rawAssigned = assignedData?.data?.[0];
        if (rawAssigned?.id) {
          const detailRes = await fetch(
            `${GRAPH_API_BASE}/${rawAssigned.id}?fields=id,username,profile_picture_url,followers_count&access_token=${longLivedToken}`,
          );
          const detailData = await detailRes.json();
          if (detailData?.id && detailData?.username) {
            igInfo = detailData;
          } else if (rawAssigned.username) {
            igInfo = rawAssigned;
          }
        }
      } catch (err) {
        this.logger.warn('Failed querying assigned_instagram_accounts:', err);
      }

      // 2. Fallback: check connected Facebook pages for linked instagram_business_account
      if (!igInfo?.id || !igInfo?.username) {
        try {
          const pagesRes = await fetch(
            `${GRAPH_API_BASE}/me/accounts?fields=id,name,instagram_business_account{id,username,profile_picture_url,followers_count}&access_token=${longLivedToken}`,
          );
          const pagesData = await pagesRes.json();
          const pageWithIg = pagesData?.data?.find((p) => p.instagram_business_account?.id && p.instagram_business_account?.username);
          if (pageWithIg?.instagram_business_account) {
            igInfo = pageWithIg.instagram_business_account;
          }
        } catch (err) {
          this.logger.warn('Failed querying me/accounts:', err);
        }
      }

      // 3. Fallback: inspect debug_token granular_scopes target_ids
      if (!igInfo?.id || !igInfo?.username) {
        try {
          const debugRes = await fetch(
            `${GRAPH_API_BASE}/debug_token?input_token=${longLivedToken}&access_token=${appId}|${appSecret}`,
          );
          const debugData = await debugRes.json();
          const targetIds = [];
          if (Array.isArray(debugData?.data?.granular_scopes)) {
            for (const scopeItem of debugData.data.granular_scopes) {
              if (Array.isArray(scopeItem.target_ids)) {
                targetIds.push(...scopeItem.target_ids);
              }
            }
          }
          for (const targetId of targetIds) {
            const accountRes = await fetch(
              `${GRAPH_API_BASE}/${targetId}?fields=id,username,profile_picture_url,followers_count&access_token=${longLivedToken}`,
            );
            const accountData = await accountRes.json();
            if (accountData?.id && accountData?.username) {
              igInfo = accountData;
              break;
            }
          }
        } catch (debugErr) {
          this.logger.warn('Failed querying debug_token fallback:', debugErr);
        }
      }

      // 4. Fallback: direct me endpoint
      if (!igInfo?.id || !igInfo?.username) {
        try {
          const directRes = await fetch(
            `${INSTAGRAM_GRAPH_API_BASE}/me?fields=id,username,account_type,profile_picture_url,followers_count,user_id&access_token=${longLivedToken}`,
          );
          const directData = await directRes.json();
          if (directData?.id && directData?.username) {
            igInfo = directData;
          }
        } catch (err) {
          this.logger.warn('Failed querying direct me:', err);
        }
      }
      if (!igInfo?.id || !igInfo?.username) {
        this.logger.error('Could not find connected Instagram account in Unified Login:', {
          assignedData,
          igInfo,
        });
        return `${baseUrl}/setup?error=invalid_instagram_account`;
      }

      accountType = igInfo.account_type || 'BUSINESS';
      webhookUserId = igInfo.user_id || igInfo.id;
    } else {
      // Step 1 (Legacy): Exchange code for short-lived access token
      const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        this.logger.error('Failed to exchange code for token:', tokenData);
        return `${baseUrl}/setup?error=token_exchange_failed`;
      }

      const shortLivedToken = tokenData.access_token;

      // Step 2: Get Instagram account info
      const infoRes = await fetch(
        `${INSTAGRAM_GRAPH_API_BASE}/me?fields=id,username,account_type,profile_picture_url,followers_count,user_id&access_token=${shortLivedToken}`,
      );
      igInfo = await infoRes.json();

      if (!igInfo?.id || !igInfo?.username) {
        this.logger.error('Invalid Instagram account response:', igInfo);
        return `${baseUrl}/setup?error=invalid_instagram_account`;
      }

      accountType = igInfo.account_type || null;

      // Step 3: Exchange for long-lived token (60 days)
      const longLivedRes = await fetch(
        `${INSTAGRAM_GRAPH_API_BASE}/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`,
      );
      const longLivedData = await longLivedRes.json();
      longLivedToken = longLivedData.access_token || shortLivedToken;
      const expiresIn = longLivedData.expires_in || 5184000;
      expiresAt = new Date(Date.now() + expiresIn * 1000);
      webhookUserId = igInfo.user_id || null;
    }

    const instagramAccountId = igInfo.id;
    const companyId = user.company!.id;

    // Check if connected to another company
    const existingAccount = await this.prisma.instagramAccount.findUnique({
      where: { instagramUserId: instagramAccountId },
      select: {
        id: true,
        companyId: true,
        username: true,
        company: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    let wasTransferred = false;

    if (existingAccount && existingAccount.companyId !== companyId) {
      // Allow seamless transfer if the user owns the existing company
      const isOwnerOfExisting = existingAccount.company?.ownerId === user.id;

      if (!isOwnerOfExisting) {
        return `${baseUrl}/setup?error=instagram_already_connected_elsewhere&instagram=${encodeURIComponent(igInfo.username || instagramAccountId)}`;
      }

      wasTransferred = true;
      this.logger.log(
        `Transferring Instagram account @${igInfo.username} (${instagramAccountId}) from company ${existingAccount.companyId} to ${companyId} (owned by user ${user.id})`,
      );

      // Clear handle on previous company
      await this.prisma.company.updateMany({
        where: {
          id: existingAccount.companyId,
          instagramHandle: igInfo.username,
        },
        data: { instagramHandle: null },
      });
    }

    await this.prisma.instagramAccount.upsert({
      where: { instagramUserId: instagramAccountId },
      create: {
        companyId,
        instagramUserId: instagramAccountId,
        username: igInfo.username,
        profilePictureUrl: igInfo.profile_picture_url ?? null,
        followersCount: igInfo.followers_count ?? null,
        accountType,
        accessToken: longLivedToken,
        accessTokenExpiresAt: expiresAt,
        webhookUserId,
        isActive: true,
      },
      update: {
        companyId, // Re-links to current company workspace
        username: igInfo.username,
        profilePictureUrl: igInfo.profile_picture_url ?? undefined,
        followersCount: igInfo.followers_count ?? undefined,
        accountType: accountType ?? undefined,
        accessToken: longLivedToken,
        accessTokenExpiresAt: expiresAt,
        webhookUserId: webhookUserId ?? undefined,
        isActive: true,
      },
    });

    // Update current company's instagramHandle
    await this.prisma.company.update({
      where: { id: companyId },
      data: { instagramHandle: igInfo.username },
    });

    // Step 4: Subscribe to webhooks
    try {
      await fetch(
        `${configId ? GRAPH_API_BASE : INSTAGRAM_GRAPH_API_BASE}/${instagramAccountId}/subscribed_apps?access_token=${longLivedToken}`,
        { method: 'POST' },
      );
    } catch (err) {
      this.logger.warn('Failed to subscribe to webhooks after account save:', err);
    }


    const transferParam = wasTransferred ? '&transferred=true' : '';
    return isNewAccountSetup
      ? `${baseUrl}/setup?new=1&instagram_connected=true${transferParam}`
      : `${baseUrl}/setup?instagram_connected=true${transferParam}`;
  }

  async getAccounts(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user?.company) {
      return { accounts: [] };
    }

    const accounts = await this.prisma.instagramAccount.findMany({
      where: { companyId: user.company.id },
      orderBy: { connectedAt: 'desc' },
    });

    return {
      accounts: accounts.map((account) => ({
        id: account.id,
        instagramUserId: account.instagramUserId,
        username: account.username,
        profilePictureUrl: account.profilePictureUrl,
        followersCount: account.followersCount,
        accountType: account.accountType,
        isActive: account.isActive,
        connectedAt: account.connectedAt,
      })),
    };
  }

  async disconnectAccount() {
    throw new ForbiddenException(
      'Disconnect is temporarily disabled. Contact support if you need to change your account.',
    );
  }

}

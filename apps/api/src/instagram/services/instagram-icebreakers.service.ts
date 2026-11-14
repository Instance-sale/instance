import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateIcebreakersDto, IcebreakerItemDto } from '../dto/instagram.dto';

function getGraphApiBase(token: string): string {
  if (token && (token.startsWith('IGAA') || token.startsWith('IGQ') || token.startsWith('AQ'))) {
    return 'https://graph.instagram.com/v24.0';
  }
  return process.env.INSTAGRAM_GRAPH_API_BASE || 'https://graph.facebook.com/v24.0';
}

@Injectable()
export class InstagramIcebreakersService {
  private readonly logger = new Logger(InstagramIcebreakersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve an InstagramAccount belonging to the company
   */
  private async resolveAccount(companyId: string, accountId?: string) {
    const account = await this.prisma.instagramAccount.findFirst({
      where: accountId ? { id: accountId, companyId } : { companyId, isActive: true },
      select: {
        id: true,
        companyId: true,
        username: true,
        facebookPageId: true,
        instagramUserId: true,
        accessToken: true,
        icebreakers: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Instagram account not found for this company');
    }
    return account;
  }

  /**
   * Fetch configured icebreakers from DB and optionally query live status from Meta
   */
  async getIcebreakers(companyId: string, accountId?: string) {
    const account = await this.resolveAccount(companyId, accountId);
    const configured: IcebreakerItemDto[] = Array.isArray(account.icebreakers)
      ? (account.icebreakers as unknown as IcebreakerItemDto[])
      : [];

    let liveMetaIcebreakers: any[] | null = null;
    let metaSynced = false;
    let metaError: string | undefined;

    if (account.accessToken) {
      try {
        const apiBase = getGraphApiBase(account.accessToken);
        const urls = [
          `${apiBase}/me/messenger_profile?fields=ice_breakers&platform=instagram&access_token=${encodeURIComponent(account.accessToken)}`,
          `${apiBase}/me/messenger_profile?fields=ice_breakers&access_token=${encodeURIComponent(account.accessToken)}`,
        ];
        if (account.facebookPageId) {
          urls.push(
            `${apiBase}/${account.facebookPageId}/messenger_profile?fields=ice_breakers&platform=instagram&access_token=${encodeURIComponent(account.accessToken)}`,
          );
        }

        for (const url of urls) {
          const res = await fetch(url, { method: 'GET' });
          const json = await res.json();

          if (res.ok && Array.isArray(json?.data) && json.data.length > 0) {
            const raw = json.data[0]?.ice_breakers;
            if (Array.isArray(raw)) {
              // Check if wrapped in locale call_to_actions structure
              if (raw[0]?.call_to_actions && Array.isArray(raw[0].call_to_actions)) {
                liveMetaIcebreakers = raw[0].call_to_actions;
              } else {
                liveMetaIcebreakers = raw;
              }
            } else {
              liveMetaIcebreakers = [];
            }
            metaSynced = true;
            metaError = undefined;
            break;
          } else if (res.ok) {
            liveMetaIcebreakers = [];
            metaSynced = true;
            metaError = undefined;
            break;
          } else {
            metaError = json?.error?.message || 'Failed to fetch live icebreakers from Meta';
          }
        }

        if (!metaSynced && metaError) {
          this.logger.warn(`[Icebreakers] Meta API returned non-ok: ${metaError}`);
        }
      } catch (err: any) {
        metaError = err?.message || 'Network error communicating with Meta';
        this.logger.warn(`[Icebreakers] Failed to fetch live icebreakers from Meta: ${metaError}`);
      }
    }

    return {
      account: {
        id: account.id,
        username: account.username,
      },
      icebreakers: configured,
      liveMetaIcebreakers,
      metaSynced,
      metaError,
    };
  }

  /**
   * Save icebreakers to DB and publish directly to Meta Messenger Profile API
   */
  async updateIcebreakers(companyId: string, updateDto: UpdateIcebreakersDto) {
    const account = await this.resolveAccount(companyId, updateDto.accountId);

    const rawList = Array.isArray(updateDto.icebreakers) ? updateDto.icebreakers : [];

    if (rawList.length > 4) {
      throw new BadRequestException('Meta allows a maximum of 4 icebreakers.');
    }

    const sanitizedIcebreakers: IcebreakerItemDto[] = [];
    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      const question = (item.question || '').trim();
      if (!question) {
        throw new BadRequestException(`Icebreaker #${i + 1} must have question text.`);
      }
      if (question.length > 80) {
        throw new BadRequestException(
          `Icebreaker #${i + 1} question exceeds 80 characters (current: ${question.length}).`,
        );
      }
      const payload = (item.payload || '').trim() || question;
      if (payload.length > 1000) {
        throw new BadRequestException(`Icebreaker #${i + 1} payload exceeds 1000 characters.`);
      }

      sanitizedIcebreakers.push({
        question,
        payload,
        automationId: item.automationId?.trim() || undefined,
      });
    }

    // 1. Persist in database
    await this.prisma.instagramAccount.update({
      where: { id: account.id },
      data: {
        icebreakers: sanitizedIcebreakers as any,
      },
    });

    // 2. Publish to Meta Graph API
    let metaSynced = false;
    let metaError: string | undefined;

    if (account.accessToken) {
      try {
        const apiBase = getGraphApiBase(account.accessToken);

        if (sanitizedIcebreakers.length > 0) {
          // Meta accepts either the nested locale call_to_actions structure or the direct flat structure
          const standardPayload = {
            platform: 'instagram',
            ice_breakers: [
              {
                locale: 'default',
                call_to_actions: sanitizedIcebreakers.map((ib) => ({
                  question: ib.question,
                  payload: ib.payload,
                })),
              },
            ],
          };

          const flatPayload = {
            platform: 'instagram',
            ice_breakers: sanitizedIcebreakers.map((ib) => ({
              question: ib.question,
              payload: ib.payload,
            })),
          };

          const endpointCandidates = [
            `${apiBase}/me/messenger_profile?platform=instagram&access_token=${encodeURIComponent(account.accessToken)}`,
            `${apiBase}/me/messenger_profile?access_token=${encodeURIComponent(account.accessToken)}`,
          ];
          if (account.facebookPageId) {
            endpointCandidates.push(
              `${apiBase}/${account.facebookPageId}/messenger_profile?platform=instagram&access_token=${encodeURIComponent(account.accessToken)}`,
              `${apiBase}/${account.facebookPageId}/messenger_profile?access_token=${encodeURIComponent(account.accessToken)}`,
            );
          }
          if (account.instagramUserId) {
            endpointCandidates.push(
              `${apiBase}/${account.instagramUserId}/messenger_profile?platform=instagram&access_token=${encodeURIComponent(account.accessToken)}`,
            );
          }

          let lastResponseJson: any = null;
          syncLoop: for (const endpoint of endpointCandidates) {
            for (const payloadToSend of [standardPayload, flatPayload]) {
              try {
                const res = await fetch(endpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payloadToSend),
                });
                const json = await res.json();
                lastResponseJson = json;
                if (res.ok && (json.result === 'success' || json.success)) {
                  metaSynced = true;
                  metaError = undefined;
                  break syncLoop;
                }
              } catch (candidateErr) {
                this.logger.debug(`[Icebreakers] Candidate failed: ${endpoint}`, candidateErr);
              }
            }
          }

          if (!metaSynced) {
            metaError = lastResponseJson?.error?.message || 'Meta API rejected messenger profile update';
            this.logger.warn(`[Icebreakers] Meta sync failed: ${metaError}`);
          }
        } else {
          // Empty list -> remove from Meta
          const deleteEndpoints = [
            `${apiBase}/me/messenger_profile?platform=instagram&access_token=${encodeURIComponent(account.accessToken)}`,
            `${apiBase}/me/messenger_profile?access_token=${encodeURIComponent(account.accessToken)}`,
          ];
          if (account.facebookPageId) {
            deleteEndpoints.push(
              `${apiBase}/${account.facebookPageId}/messenger_profile?platform=instagram&access_token=${encodeURIComponent(account.accessToken)}`,
            );
          }
          for (const deleteUrl of deleteEndpoints) {
            const res = await fetch(deleteUrl, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ platform: 'instagram', fields: ['ice_breakers'] }),
            });
            const json = await res.json();
            if (res.ok && (json.result === 'success' || json.success)) {
              metaSynced = true;
              metaError = undefined;
              break;
            } else {
              metaError = json?.error?.message || 'Meta API failed to delete icebreakers';
            }
          }
        }
      } catch (err: any) {
        metaError = err?.message || 'Network error syncing with Meta';
        this.logger.warn(`[Icebreakers] Exception syncing with Meta: ${metaError}`);
      }
    }

    return {
      success: true,
      icebreakers: sanitizedIcebreakers,
      metaSynced,
      metaError,
    };
  }

  /**
   * Delete icebreakers in DB and clear on Meta
   */
  async deleteIcebreakers(companyId: string, accountId?: string) {
    const account = await this.resolveAccount(companyId, accountId);

    await this.prisma.instagramAccount.update({
      where: { id: account.id },
      data: {
        icebreakers: null,
      },
    });

    let metaSynced = false;
    let metaError: string | undefined;

    if (account.accessToken) {
      try {
        const apiBase = getGraphApiBase(account.accessToken);
        const deleteUrls = [
          `${apiBase}/me/messenger_profile?platform=instagram&access_token=${encodeURIComponent(account.accessToken)}`,
          `${apiBase}/me/messenger_profile?access_token=${encodeURIComponent(account.accessToken)}`,
        ];
        if (account.facebookPageId) {
          deleteUrls.push(
            `${apiBase}/${account.facebookPageId}/messenger_profile?platform=instagram&access_token=${encodeURIComponent(account.accessToken)}`,
          );
        }
        for (const url of deleteUrls) {
          const res = await fetch(url, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform: 'instagram', fields: ['ice_breakers'] }),
          });
          const json = await res.json();
          if (res.ok && (json.result === 'success' || json.success)) {
            metaSynced = true;
            metaError = undefined;
            break;
          } else {
            metaError = json?.error?.message || 'Meta failed to clear icebreakers';
          }
        }
      } catch (err: any) {
        metaError = err?.message || 'Network error clearing icebreakers from Meta';
      }
    }

    return {
      success: true,
      message: 'Icebreakers cleared successfully',
      metaSynced,
      metaError,
    };
  }
}

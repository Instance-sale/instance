import { prisma } from '@instance/db';

/**
 * Resolves the appropriate Meta Graph API base endpoint.
 *
 * Open-source developer note:
 * - Tokens starting with 'IGA' are Instagram User Access Tokens (Instagram Login),
 *   which use 'graph.instagram.com'.
 * - Standard Facebook Page Access Tokens (Facebook Login for Instagram Business)
 *   use 'graph.facebook.com'.
 * Both endpoints can be overridden via INSTAGRAM_BASE_URL or INSTAGRAM_GRAPH_API_BASE.
 */
function getGraphApiBase(accessToken: string): string {
  if (accessToken && accessToken.startsWith('IGA')) {
    return process.env.INSTAGRAM_BASE_URL || 'https://graph.instagram.com/v21.0';
  }
  return process.env.INSTAGRAM_GRAPH_API_BASE || 'https://graph.facebook.com/v21.0';
}

export interface InstagramProfileResult {
  id: string;
  username?: string;
  name?: string;
  profile_pic?: string;
  biography?: string;
  website?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  is_verified?: boolean;
  is_business_account?: boolean;
}

/**
 * Service for communicating directly with Meta's Graph API.
 * Handles profile lookups, messaging templates, comment replies, likes, hides,
 * and automatic graceful degradation when Meta rejects interactive templates.
 */
export class InstagramApiService {
  /**
   * Fetches Instagram user profile details from Meta Graph API.
   * First requests full profile metrics (followers, bio, website). If the token
   * lacks extended permissions, automatically falls back to basic public fields.
   */
  async fetchUserProfile(
    accessToken: string,
    instagramUserId: string,
  ): Promise<InstagramProfileResult> {
    const baseUrl = getGraphApiBase(accessToken);
    const fullFields = ['id', 'username', 'name', 'profile_pic', 'biography', 'website', 'followers_count', 'follows_count', 'media_count', 'is_business_account'].join(',');
    let url = `${baseUrl}/${instagramUserId}?fields=${fullFields}`;
    let response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    let data = await response.json().catch(() => ({}));

    if (!response.ok || data.error) {
      const basicFields = ['id', 'username', 'name', 'profile_pic'].join(',');
      url = `${baseUrl}/${instagramUserId}?fields=${basicFields}`;
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      data = await response.json().catch(() => ({}));
    }

    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || `HTTP ${response.status}: Failed to fetch profile for ${instagramUserId}`;
      console.warn(`[InstagramApi] Profile fetch error for ${instagramUserId}:`, errorMsg);
      throw new Error(errorMsg);
    }

    return data as InstagramProfileResult;
  }

  /**
   * Dispatches an outbound Instagram Direct Message via Meta Graph API.
   *
   * Supports rich messaging formats:
   * - Interactive Button Templates (up to 3 in-bubble buttons)
   * - Native Quick Replies (up to 13 pill buttons above the keyboard)
   * - Generic Template Carousels (up to 10 swipeable cards)
   * - Private Replies (commentId passed in options triggers comment-to-DM delivery)
   *
   * Resilience & Degradation Guarantee:
   * Videos are converted to clickable text links to prevent Meta binary upload errors.
   * If Meta rejects rich templates, automatically falls back to plain text with links.
   */
  async sendMessage(
    accessToken: string,
    recipientId: string,
    message: string,
    mediaUrl?: string,
    messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' = 'TEXT',
    buttons?: Array<{ type: 'reply' | 'link'; title: string; url?: string }>,
    buttonStyle: 'buttons' | 'quick_replies' = 'buttons',
    carouselCards?: Array<{
      imageUrl?: string;
      image_url?: string;
      title: string;
      subtitle?: string;
      buttons?: Array<{ type: 'reply' | 'link'; title: string; url?: string }>;
    }>,
    options?: {
      messagingType?: string;
      tag?: string;
      commentId?: string;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const url = `${getGraphApiBase(accessToken)}/me/messages`;
      const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };

      const validButtons = Array.isArray(buttons)
        ? buttons.filter((b) => b && typeof b.title === 'string' && b.title.trim().length > 0)
        : [];

      const validCarouselCards = Array.isArray(carouselCards)
        ? carouselCards
          .filter((c) => c && typeof c.title === 'string' && c.title.trim().length > 0)
          .slice(0, 10)
        : [];

      // Videos are ALWAYS sent as clickable web links in the text message body.
      // Never send video links as raw Meta video binary attachments to avoid Meta rejection and risk of account restrictions.
      const isVideo =
        (messageType && messageType.toUpperCase() === 'VIDEO') ||
        (Boolean(mediaUrl) && (
          /youtube\.com|youtu\.be|loom\.com|vimeo\.com|drive\.google\.com|wistia\.com|vidyard\.com/i.test(mediaUrl!) ||
          /\.(mp4|mov|webm|avi|m4v|mkv)($|\?)/i.test(mediaUrl!)
        ));

      if (isVideo && mediaUrl) {
        message = message && message.trim() ? `${message.trim()}\n\n${mediaUrl}` : mediaUrl;
        mediaUrl = undefined;
        messageType = 'TEXT';
      }

      const effectiveMessagingType = options?.messagingType || 'RESPONSE';
      const tagPayload = options?.tag ? { tag: options.tag } : {};
      const recipientPayload = options?.commentId
        ? { comment_id: options.commentId }
        : { id: recipientId };

      const payload: any = {
        recipient: recipientPayload,
        messaging_type: effectiveMessagingType,
        ...tagPayload,
      };

      const isQuickReplyMode = buttonStyle === 'quick_replies';

      if (validCarouselCards.length > 0) {
        // Meta Generic Template Carousel: swipeable multi-card template (up to 10 cards)
        if (message && message.trim()) {
          try {
            await fetch(url, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                recipient: recipientPayload,
                messaging_type: effectiveMessagingType,
                ...tagPayload,
                message: { text: message.trim() },
              }),
            });
          } catch (textErr: any) {
            console.warn(`[InstagramApi] Failed to send accompanying text for carousel:`, textErr);
          }
        }

        const elements = validCarouselCards.map((card) => {
          const cardImg = card.imageUrl || (card as any).image_url;
          const cardButtons = Array.isArray(card.buttons)
            ? card.buttons.filter((b) => b && typeof b.title === 'string' && b.title.trim().length > 0).slice(0, 3)
            : [];

          const element: any = {
            title: card.title.trim().substring(0, 80),
          };

          if (card.subtitle && card.subtitle.trim()) {
            element.subtitle = card.subtitle.trim().substring(0, 80);
          }

          if (cardImg) {
            element.image_url = cardImg;
          }

          if (cardButtons.length > 0) {
            element.buttons = cardButtons.map((b) => {
              if (b.type === 'link' && b.url) {
                return {
                  type: 'web_url',
                  url: b.url.trim(),
                  title: b.title.trim().substring(0, 20),
                };
              }
              return {
                type: 'postback',
                title: b.title.trim().substring(0, 20),
                payload: b.title.trim().substring(0, 80),
              };
            });
          }

          return element;
        });

        payload.message = {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements,
            },
          },
        };
      } else if (validButtons.length > 0) {
        if (isQuickReplyMode) {
          // Native Instagram Quick Replies: horizontal pill buttons floating above the user keyboard (up to 13 items)
          // Disappears immediately once the user taps an option, keeping conversation clean and preventing duplicate actions
          if (mediaUrl && messageType !== 'TEXT') {
            try {
              await fetch(url, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                  recipient: recipientPayload,
                  messaging_type: effectiveMessagingType,
                  ...tagPayload,
                  message: {
                    attachment: {
                      type: messageType.toLowerCase(),
                      payload: { url: mediaUrl },
                    },
                  },
                }),
              });
            } catch (mediaErr: any) {
              console.warn(`[InstagramApi] Failed to send accompanying media for quick replies:`, mediaErr);
            }
          }

          payload.message = {
            text: (message || 'Please select an option:').substring(0, 1000),
            quick_replies: validButtons.slice(0, 13).map((b) => ({
              content_type: 'text',
              title: b.title.trim().substring(0, 20),
              payload: b.title.trim().substring(0, 80),
            })),
          };
        } else if (mediaUrl) {
          // If media is present, Generic Template embeds the image + title + buttons inside a card in the message thread
          const cardTitle = (message || 'Please tap below:').substring(0, 80);
          const cardSubtitle = message && message.length > 80 ? message.substring(80, 160) : undefined;

          payload.message = {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'generic',
                elements: [
                  {
                    title: cardTitle,
                    ...(cardSubtitle ? { subtitle: cardSubtitle } : {}),
                    image_url: mediaUrl,
                    buttons: validButtons.slice(0, 3).map((b) => {
                      if (b.type === 'link' && b.url) {
                        return {
                          type: 'web_url',
                          url: b.url.trim(),
                          title: b.title.trim().substring(0, 20),
                        };
                      }
                      return {
                        type: 'postback',
                        title: b.title.trim().substring(0, 20),
                        payload: b.title.trim().substring(0, 20),
                      };
                    }),
                  },
                ],
              },
            },
          };
        } else {
          // Meta Button Template: embeds up to 3 buttons directly inside the message bubble (Instance style)
          payload.message = {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'button',
                text: (message || 'Choose an option below:').substring(0, 640),
                buttons: validButtons.slice(0, 3).map((b) => {
                  if (b.type === 'link' && b.url) {
                    return {
                      type: 'web_url',
                      url: b.url.trim(),
                      title: b.title.trim().substring(0, 20),
                    };
                  }
                  return {
                    type: 'postback',
                    title: b.title.trim().substring(0, 20),
                    payload: b.title.trim().substring(0, 20),
                  };
                }),
              },
            },
          };
        }
      } else if (mediaUrl && messageType !== 'TEXT') {
        // If conversational text exists alongside the native attachment, dispatch text first so message context is not lost
        if (message && message.trim()) {
          try {
            await fetch(url, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                recipient: recipientPayload,
                messaging_type: effectiveMessagingType,
                ...tagPayload,
                message: { text: message.trim() },
              }),
            });
          } catch (textErr: any) {
            console.warn(`[InstagramApi] Failed to send accompanying conversational text:`, textErr);
          }
        }

        const attachmentType = messageType.toLowerCase();
        payload.message = {
          attachment: {
            type: attachmentType,
            payload: { url: mediaUrl },
          },
        };
      } else {
        payload.message = { text: message };
      }

      let response = await fetch(url, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      let data = await response.json();

      // If button template failed, attempt Generic Template before falling back to text
      if ((!response.ok || data.error) && validButtons.length > 0 && !isQuickReplyMode) {
        const firstError = data.error?.message || `HTTP ${response.status}`;
        console.warn(`[InstagramApi] Primary button template attempt failed: ${firstError}. Trying Generic Template format...`);

        const genericPayload: any = {
          recipient: recipientPayload,
          messaging_type: effectiveMessagingType,
          ...tagPayload,
          message: {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'generic',
                elements: [
                  {
                    title: (message || 'Please tap below:').substring(0, 80),
                    buttons: validButtons.slice(0, 3).map((b) => {
                      if (b.type === 'link' && b.url) {
                        return {
                          type: 'web_url',
                          url: b.url.trim(),
                          title: b.title.trim().substring(0, 20),
                        };
                      }
                      return {
                        type: 'postback',
                        title: b.title.trim().substring(0, 20),
                        payload: b.title.trim().substring(0, 20),
                      };
                    }),
                  },
                ],
              },
            },
          },
        };

        response = await fetch(url, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(genericPayload),
        });
        data = await response.json();
      }

      // If templates or quick replies fail completely, fallback to text message with links or option list
      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || `HTTP ${response.status}: Failed to send DM`;
        console.warn(`[InstagramApi] Interactive send failed: ${errorMsg}. Attempting text delivery...`);

        if (validButtons.length > 0) {
          let fallbackText = message || '';
          if (isQuickReplyMode) {
            fallbackText += (fallbackText ? '\n\n' : '') + 'Options:\n' + validButtons.map((b) => `• ${b.title}`).join('\n');
          } else {
            const linkButtons = validButtons.filter((b) => b.type === 'link' && b.url);
            if (linkButtons.length > 0) {
              fallbackText += (fallbackText ? '\n\n' : '') + linkButtons.map((b) => `[Link] ${b.title}: ${b.url}`).join('\n');
            }
          }

          response = await fetch(url, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              recipient: recipientPayload,
              messaging_type: effectiveMessagingType,
              ...tagPayload,
              message: { text: fallbackText || 'Hello!' },
            }),
          });
          data = await response.json();
        } else if (mediaUrl) {
          // If native attachment failed (e.g. Meta could not download image/audio), fallback to sending URL as text
          const fallbackText = message && message.trim() ? `${message.trim()}\n\n${mediaUrl}` : mediaUrl;
          response = await fetch(url, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              recipient: recipientPayload,
              messaging_type: effectiveMessagingType,
              ...tagPayload,
              message: { text: fallbackText },
            }),
          });
          data = await response.json();
        } else if (validCarouselCards.length > 0) {
          let fallbackText = message && message.trim() ? `${message.trim()}\n\n` : '';
          fallbackText += validCarouselCards.map((c) => {
            let cardText = `• ${c.title}`;
            if (c.subtitle) cardText += ` - ${c.subtitle}`;
            const linkBtns = (c.buttons || []).filter((b) => b.type === 'link' && b.url);
            if (linkBtns.length > 0) {
              cardText += '\n' + linkBtns.map((b) => `  ${b.title}: ${b.url}`).join('\n');
            }
            return cardText;
          }).join('\n\n');

          response = await fetch(url, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              recipient: recipientPayload,
              messaging_type: effectiveMessagingType,
              ...tagPayload,
              message: { text: fallbackText || 'Here is your info:' },
            }),
          });
          data = await response.json();
        }

        if (!response.ok || data.error) {
          const finalErrorMsg = data.error?.message || `HTTP ${response.status}: Failed to send DM`;
          console.warn(`[InstagramApi] Send message failed permanently:`, finalErrorMsg);
          return { success: false, error: finalErrorMsg };
        }
      }

      return { success: true, messageId: data.message_id || data.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Replies publicly to a comment on an Instagram media post or reel.
   * Requires the 'instagram_manage_comments' permission on the Meta access token.
   */
  async replyToComment(
    accessToken: string,
    commentId: string,
    message: string,
  ): Promise<{ success: boolean; commentId?: string; error?: string }> {
    try {
      const url = `${getGraphApiBase(accessToken)}/${commentId}/replies`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || `HTTP ${response.status}: Failed to reply to comment`;
        console.warn(`[InstagramApi] Comment reply failed:`, errorMsg);
        return { success: false, error: errorMsg };
      }

      return { success: true, commentId: data.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Likes a user comment (sends a Heart reaction).
   * Attempts /{igUserId}/likes first, falling back to /me/likes for compatibility
   * across both Facebook Page-linked accounts and Instagram professional accounts.
   */
  async likeComment(
    accessToken: string,
    commentId: string,
    igUserId?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const baseUrl = getGraphApiBase(accessToken);
      const targetUser = igUserId || 'me';
      const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };
      const url = `${baseUrl}/${targetUser}/likes?comment_id=${encodeURIComponent(commentId)}`;

      let response = await fetch(url, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ comment_id: commentId }),
      });

      let data = await response.json().catch(() => ({}));

      // Fallback: If /{igUserId}/likes failed and igUserId was passed, try /me/likes
      if ((!response.ok || data.error) && igUserId) {
        const fallbackUrl = `${baseUrl}/me/likes?comment_id=${encodeURIComponent(commentId)}`;
        const fbRes = await fetch(fallbackUrl, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ comment_id: commentId }),
        });
        const fbData = await fbRes.json().catch(() => ({}));
        if (fbRes.ok && !fbData.error) {
          return { success: true };
        }
      }

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || `HTTP ${response.status}: Failed to like comment`;
        console.warn(`[InstagramApi] Comment like failed:`, errorMsg);
        return { success: false, error: errorMsg };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Hides a user comment on a post or reel.
   * Hiding removes the comment from public visibility while keeping it visible to the author.
   */
  async hideComment(
    accessToken: string,
    commentId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${getGraphApiBase(accessToken)}/${commentId}?hide=true`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ hide: true }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || `HTTP ${response.status}: Failed to hide comment`;
        console.warn(`[InstagramApi] Comment hide failed:`, errorMsg);
        return { success: false, error: errorMsg };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Logs Meta Graph API errors into ApiErrorLog and updates InstagramAccountHealth.
   * If error code 4 or 429 is encountered, updates account status to 'THROTTLED'.
   */
  async logApiError(
    instagramAccountId: string,
    endpoint: string,
    error: any,
    context?: { automationId?: string; userId?: string },
  ): Promise<void> {
    try {
      const errorCode = error?.code?.toString() || 'UNKNOWN';
      const errorMessage = error?.message || String(error);

      // 1. Record error log
      await prisma.apiErrorLog.create({
        data: {
          instagramAccountId,
          endpoint,
          errorCode,
          errorType: errorCode === '4' || errorCode === '429' ? 'RATE_LIMIT' : 'UNKNOWN',
          errorMessage,
          automationId: context?.automationId || null,
          userId: context?.userId || null,
        },
      });

      // 2. Update account health
      await prisma.instagramAccountHealth.upsert({
        where: { instagramAccountId },
        update: {
          lastErrorCode: errorCode,
          lastErrorMessage: errorMessage,
          consecutiveErrors: { increment: 1 },
          status: errorCode === '4' || errorCode === '429' ? 'THROTTLED' : undefined,
        },
        create: {
          instagramAccountId,
          lastErrorCode: errorCode,
          lastErrorMessage: errorMessage,
          consecutiveErrors: 1,
          status: errorCode === '4' || errorCode === '429' ? 'THROTTLED' : 'HEALTHY',
        },
      });
    } catch (err: any) {
      console.error('[InstagramApi] Failed to log API error:', err.message);
    }
  }
}

export const instagramApiService = new InstagramApiService();

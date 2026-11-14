export const QUEUE_NAMES = {
  PROFILE_FETCH: 'instagram-profile-fetch',
  SEND_MESSAGE: 'instagram-send-message',
  REPLY_COMMENT: 'instagram-reply-comment',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

import { DmCarouselCard } from './automations';

export interface BaseJobData {
  instagramAccountId: string;
  automationId?: string;
}

export interface ProfileFetchJobData extends BaseJobData {
  userId: string;
  interactionType: 'FOLLOW' | 'DM' | 'COMMENT';
}

export interface SendMessageButton {
  type: 'reply' | 'link';
  title: string;
  url?: string;
}

export interface SendMessageJobData extends BaseJobData {
  recipientId: string;
  message: string;
  messageType?: 'TEXT' | 'IMAGE' | 'VIDEO';
  mediaUrl?: string;
  buttons?: SendMessageButton[];
  buttonStyle?: 'buttons' | 'quick_replies';
  carouselCards?: DmCarouselCard[];
  delaySeconds?: number;
  executionId?: string;
  conversationId?: string;
}

export interface ReplyCommentJobData extends BaseJobData {
  commentId: string;
  message: string;
  executionId?: string;
}


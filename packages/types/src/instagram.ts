export interface InstagramAccountHealth {
  isValid: boolean;
  needsReconnect: boolean;
  expiresInDays?: number;
  scopes?: string[];
  lastCheckedAt: string;
}

export interface InstagramWebhookEntry {
  id: string;
  time: number;
  messaging?: Array<{
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: {
      mid: string;
      text?: string;
      attachments?: Array<{ type: string; payload: { url: string } }>;
      is_echo?: boolean;
    };
  }>;
  changes?: Array<{
    field: string;
    value: {
      from: { id: string; username?: string };
      item?: string;
      comment_id?: string;
      media?: { id: string };
      message?: string;
    };
  }>;
}

export interface InstagramWebhookPayload {
  object: 'instagram' | 'page';
  entry: InstagramWebhookEntry[];
}

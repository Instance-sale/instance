export interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  isAutomated?: boolean;
  automation?: {
    id: string;
    name: string;
    triggerType: string;
    isActive: boolean;
  } | null;
}

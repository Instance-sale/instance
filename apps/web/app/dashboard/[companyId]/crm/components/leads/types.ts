export interface Lead {
  id: string;
  instagramUserId: string;
  username: string | null;
  fullName: string | null;
  biography: string | null;
  website: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  firstInteractionType: string | null;
  firstInteractionAt: string | null;
  createdAt: string;
  updatedAt: string;
  emails?: string[];
  phoneNumbers?: string[];
  email?: string;
  phone?: string;
  status?: string | null;
  tags?: string[];
  contactCaptureId?: string | null;
  audienceLists?: Array<{ id: string; name: string; color: string }>;
  primaryAudienceList?: { id: string; name: string; color: string } | null;
  originAutomation?: {
    automationId: string;
    automationName: string;
    folderName?: string | null;
    folderColor?: string | null;
    selectedStages?: string[] | null;
  } | null;
}

export interface LeadsResponse {
  leads: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  stats: {
    total: number;
    followUpCount?: number;
  };
}

export interface LeadsTableProps {
  instagramAccountId: string;
  basePath?: string;
}

export type SortField = 'createdAt' | 'username' | 'fullName' | 'firstInteractionAt';
export type InteractionFilter = 'all' | 'FOLLOW' | 'DM' | 'COMMENT' | 'STORY';
export type ViewMode = 'table' | 'kanban';

export interface PipelineConfig {
  customStatuses: string[];
  customTags: string[];
}

export interface PipelineColumnState {
  leads: Lead[];
  page: number;
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
}

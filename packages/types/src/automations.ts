export enum AutomationNodeType {
  // Triggers
  TRIGGER_DM = 'TRIGGER_DM',
  TRIGGER_COMMENT = 'TRIGGER_COMMENT',
  TRIGGER_STORY = 'TRIGGER_STORY',
  TRIGGER_FOLLOWER = 'TRIGGER_FOLLOWER',

  // Actions
  ACTION_SEND_DM = 'ACTION_SEND_DM',
  ACTION_REPLY_DM = 'ACTION_REPLY_DM',
  ACTION_REPLY_COMMENT = 'ACTION_REPLY_COMMENT',
  ACTION_WAIT = 'ACTION_WAIT',
  ACTION_WAIT_FOR_REPLY = 'ACTION_WAIT_FOR_REPLY',
  ACTION_CONDITION = 'ACTION_CONDITION',
  ACTION_SET_VARIABLE = 'ACTION_SET_VARIABLE',
  // Flow control
  FLOW_SPLIT = 'FLOW_SPLIT',
  FLOW_RANDOM = 'FLOW_RANDOM',
  FLOW_END = 'FLOW_END',
}

export interface NodeConfig {
  [key: string]: any;
}

export interface AutomationNode {
  id: string;
  type: AutomationNodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    config?: NodeConfig;
  };
}

export interface DmCarouselButton {
  type: 'reply' | 'link';
  title: string;
  url?: string;
}

export interface DmCarouselCard {
  id: string;
  imageUrl: string;
  title: string;
  subtitle?: string;
  buttons: DmCarouselButton[];
}

export interface DmNodeConfig extends NodeConfig {
  messageFormat?: 'text' | 'carousel';
  message?: string;
  mediaUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
  buttons?: Array<{ type: 'reply' | 'link'; title: string; url?: string }>;
  carouselCards?: DmCarouselCard[];
  waitForReplyAfterSend?: boolean;
  buttonPaths?: Record<string, string>;
  defaultPath?: string;
}



/**
 * Automation Node Type Definitions
 */

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

export const NODE_TYPES = {
  trigger: [
    {
      type: AutomationNodeType.TRIGGER_DM,
      label: 'DM Received',
      description: 'Trigger when someone sends a DM',
      icon: 'message-circle',
    },
    {
      type: AutomationNodeType.TRIGGER_COMMENT,
      label: 'Comment',
      description: 'Trigger when someone comments',
      icon: 'message-square',
    },
    {
      type: AutomationNodeType.TRIGGER_STORY,
      label: 'Story Mention',
      description: 'Trigger when mentioned in story',
      icon: 'image',
    },
  ],
  action: [
    {
      type: AutomationNodeType.ACTION_SEND_DM,
      label: 'Send DM',
      description: 'Send a direct message',
      icon: 'send',
    },
    {
      type: AutomationNodeType.ACTION_REPLY_DM,
      label: 'Reply DM',
      description: 'Reply to the last DM in conversation',
      icon: 'reply',
    },
    {
      type: AutomationNodeType.ACTION_REPLY_COMMENT,
      label: 'Reply Comment',
      description: 'Reply to a comment',
      icon: 'corner-down-left',
    },
    {
      type: AutomationNodeType.ACTION_SET_VARIABLE,
      label: 'Set Variable',
      description: 'Store a value, tag, or pipeline stage',
      icon: 'database',
    },
  ],
  flow: [
    {
      type: AutomationNodeType.ACTION_CONDITION,
      label: 'Condition',
      description: 'Branch based on conditions (variables, tags, numbers, booleans, or follower status)',
      icon: 'git-branch',
    },
    {
      type: AutomationNodeType.FLOW_RANDOM,
      label: 'Randomizer',
      description: 'Random path for A/B testing',
      icon: 'shuffle',
    },
    {
      type: AutomationNodeType.FLOW_SPLIT,
      label: 'Split',
      description: 'Split into multiple paths',
      icon: 'share-2',
    },
  ],
};

/** UI-hidden; engine still runs these for saved automations created before the refactor. */
export const DEPRECATED_NODE_TYPES = [
  AutomationNodeType.TRIGGER_FOLLOWER,
  AutomationNodeType.ACTION_WAIT,
  AutomationNodeType.ACTION_WAIT_FOR_REPLY,
  AutomationNodeType.FLOW_END,
] as const;

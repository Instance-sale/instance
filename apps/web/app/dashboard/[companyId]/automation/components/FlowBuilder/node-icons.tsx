"use client";

import {
  MessageCircle,
  MessageSquare,
  Image,
  UserPlus,
  Send,
  Reply,
  CornerDownLeft,
  Timer,
  Clock,
  Database,
  Bot,
  Sparkles,
  GitBranch,
  Shuffle,
  Share2,
  Flag,
  Settings,
  Sliders,
  Zap,
  Bell,
  Tag,
  FileText,
  Mic,
  User,
  Camera,
  Shield,
  Heart,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export const NODE_ICON_KEYS = {
  "message-circle": MessageCircle,
  "message-square": MessageSquare,
  image: Image,
  "user-plus": UserPlus,
  send: Send,
  reply: Reply,
  "corner-down-left": CornerDownLeft,
  timer: Timer,
  clock: Clock,
  database: Database,
  bot: Bot,
  sparkles: Sparkles,
  "git-branch": GitBranch,
  shuffle: Shuffle,
  "share-2": Share2,
  flag: Flag,
  settings: Settings,
  sliders: Sliders,
  zap: Zap,
  bell: Bell,
  tag: Tag,
  "file-text": FileText,
  mic: Mic,
  user: User,
  camera: Camera,
  shield: Shield,
  heart: Heart,
  workflow: Workflow,
} as const;

export type NodeIconKey = keyof typeof NODE_ICON_KEYS;

const ICON_KEYS = Object.keys(NODE_ICON_KEYS) as NodeIconKey[];

export function isIconKey(value: string): value is NodeIconKey {
  return ICON_KEYS.includes(value as NodeIconKey);
}

interface NodeIconProps {
  icon: string;
  className?: string;
  size?: number;
}

export function NodeIcon({ icon, className = "", size = 20 }: NodeIconProps) {
  const normalizedKey = (icon || "").toLowerCase().trim();
  if (isIconKey(normalizedKey)) {
    const LucideIcon = NODE_ICON_KEYS[normalizedKey] as LucideIcon;
    return <LucideIcon className={className} size={size} strokeWidth={2} />;
  }
  // Professional fallback: Render Lucide Settings icon instead of raw emoji
  return <Settings className={className} size={size} strokeWidth={2} />;
}

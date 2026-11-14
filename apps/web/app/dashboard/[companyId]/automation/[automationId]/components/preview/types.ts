import { Node, Edge } from "@xyflow/react";

export interface AutomationPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  viewMode?: "mobile" | "desktop";
  nodes: Node[];
  edges: Edge[];
  automationName: string;
  userName?: string;
  userProfilePicture?: string;
}

export interface ChatButton {
  title: string;
  type?: "reply" | "url" | "link";
  url?: string;
  targetNodeId?: string;
}

export interface ChatCarouselCard {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttons?: ChatButton[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "business";
  text: string;
  buttons?: ChatButton[];
  buttonStyle?: "buttons" | "quick_replies";
  carouselCards?: ChatCarouselCard[];
  timestamp: Date;
  contextTag?: string;
  isTrigger?: boolean;
  mediaType?: "TEXT" | "AUDIO" | "FILE" | "IMAGE";
  mediaUrl?: string;
}


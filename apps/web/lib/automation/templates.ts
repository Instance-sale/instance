/**
 * Premade Automation Templates
 * Each template defines nodes that will be created when the template is selected
 */

import { AutomationNodeType } from "./nodes";

export interface AutomationTemplate {
  id: string;
  title: string;
  description: string;
  category: "quick" | "flow";
  tags: string[];
  goal: "grow" | "engage" | "drive" | "convert" | "qualify";
  trigger: "dm" | "comment" | "story" | "follower" | "live";
  badge?: "NEW" | "POPULAR" | "PRO";
  // Preview content for the template detail page
  preview?: {
    businessValue: string;
    howItWorks: string;
    conversationMessages: Array<{
      type: "sent" | "received" | "buttons";
      text?: string;
      buttons?: string[];
      highlight?: boolean;
    }>;
  };
  // Pre-configured nodes for this template
  nodes: Array<{
    nodeId: string;
    type: string;
    position: { x: number; y: number };
    config: Record<string, any>;
    nextNodeIds: string[];
  }>;
  // Default automation config
  triggerType: string;
  triggerKeywords?: string[];
  triggerMatchType?: string;
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [

  {
    id: "auto-dm-links-comments",
    title: "Auto-DM links from comments",
    description: "Send a link when people comment on a post or reel",
    category: "quick",
    tags: ["comment", "link", "dm"],
    goal: "drive",
    trigger: "comment",
    badge: "POPULAR",
    triggerType: "COMMENT_POST",
    triggerKeywords: [],
    preview: {
      businessValue: "Turn comments into clicks. Every comment becomes an opportunity to share your link directly and privately.",
      howItWorks: "When someone comments on your post, they get your link delivered straight to their DMs. No more \"link in bio\" frustration!",
      conversationMessages: [
        { type: "received", text: "Love this! Where can I get it?" },
        { type: "sent", text: "Thanks for commenting! Here's the link you requested: [YOUR_LINK_HERE]" },
      ],
    },
    nodes: [
      {
        nodeId: "trigger-comment",
        type: AutomationNodeType.TRIGGER_COMMENT,
        position: { x: 250, y: 100 },
        config: {
          autoLikeComment: true,
        },
        nextNodeIds: ["action-send-link"],
      },
      {
        nodeId: "action-send-link",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 250, y: 250 },
        config: {
          delayEnabled: true,
          delaySeconds: 3,
          typingIndicator: true,
          message: "Thanks for commenting! Here's the link you requested: [YOUR_LINK_HERE]",
        },
        nextNodeIds: [],
      },
    ],
  },
  {
    id: "generate-leads-stories",
    title: "Generate leads with stories",
    description: "Use limited-time offers in your Stories to convert leads",
    category: "quick",
    tags: ["story", "leads", "offer"],
    goal: "convert",
    trigger: "story",
    triggerType: "STORY_REPLY",
    preview: {
      businessValue: "Stories create urgency. Capitalize on that FOMO by sending exclusive offers to anyone who engages.",
      howItWorks: "When someone replies to your story, they instantly receive a limited-time offer. Urgency + convenience = conversions.",
      conversationMessages: [
        { type: "received", text: "This looks amazing! 😍" },
        { type: "sent", text: "Thanks for your interest! Here's your exclusive offer: [YOUR_OFFER] Limited time only! ⏰" },
      ],
    },
    nodes: [
      {
        nodeId: "trigger-story",
        type: AutomationNodeType.TRIGGER_STORY,
        position: { x: 250, y: 100 },
        config: {},
        nextNodeIds: ["action-offer-dm"],
      },
      {
        nodeId: "action-offer-dm",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 250, y: 250 },
        config: {
          message: "Thanks for your interest! Here's your exclusive offer: [YOUR_OFFER] Limited time only! ⏰",
        },
        nextNodeIds: [],
      },
    ],
  },
  // FLOW BUILDER TEMPLATES
  {
    id: "auto-reply-comment-dm",
    title: "Auto-reply to comment in DM",
    description: "Reply to comments on your post/reel and send a DM with product details",
    category: "flow",
    tags: ["comment", "dm", "products", "reply"],
    goal: "convert",
    trigger: "comment",
    triggerType: "COMMENT_POST",
    preview: {
      businessValue: "Engage commenters instantly with a reply, then follow up with a personalized DM containing your product lineup or links.",
      howItWorks: "When someone comments on your post or reel, automatically reply to their comment publicly, then send them a DM with product details.",
      conversationMessages: [
        { type: "received", text: "Love this! 🔥" },
        { type: "sent", text: "Thanks for your interest! Check out our product lineup: [PRODUCT_DETAILS]" },
      ],
    },
    nodes: [
      {
        nodeId: "trigger-comment",
        type: AutomationNodeType.TRIGGER_COMMENT,
        position: { x: 250, y: 100 },
        config: {
          keywords: [],
          matchType: "CONTAINS",
          mediaType: "ALL",
          autoLikeComment: true,
        },
        nextNodeIds: ["action-reply-comment"],
      },
      {
        nodeId: "action-reply-comment",
        type: AutomationNodeType.ACTION_REPLY_COMMENT,
        position: { x: 250, y: 250 },
        config: {
          message: "Thanks for your comment! 😊 Check your DMs for more details.",
        },
        nextNodeIds: ["action-send-product-dm"],
      },
      {
        nodeId: "action-send-product-dm",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 250, y: 400 },
        config: {
          delayEnabled: true,
          delaySeconds: 2,
          typingIndicator: true,
          message: "Thanks for your interest! Check out our product lineup: [PRODUCT_DETAILS]",
        },
        nextNodeIds: [],
      },
    ],
  },
  {
    id: "auto-send-links-dm",
    title: "Auto-send links in DM",
    description: "Automate DMs to send followers to your website. Sick of saying \"link in bio\" like...",
    category: "flow",
    tags: ["dm", "link", "website"],
    goal: "drive",
    trigger: "dm",
    triggerType: "DM_RECEIVED",
    triggerKeywords: ["link", "website", "url"],
    triggerMatchType: "ANY",
    preview: {
      businessValue: "Deliver website links immediately when followers ask in DMs. Never lose traffic to bio link friction.",
      howItWorks: "When a follower DMs keywords like 'link' or 'website', an automated DM delivers your URL instantly.",
      conversationMessages: [
        { type: "received", text: "Can you send me the link?" },
        { type: "sent", text: "Here's the link you asked for: [YOUR_WEBSITE_LINK]" },
      ],
    },
    nodes: [
      {
        nodeId: "trigger-dm",
        type: AutomationNodeType.TRIGGER_DM,
        position: { x: 250, y: 100 },
        config: {},
        nextNodeIds: ["action-send-link"],
      },
      {
        nodeId: "action-send-link",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 250, y: 250 },
        config: {
          message: "Here's the link you asked for: [YOUR_WEBSITE_LINK]",
        },
        nextNodeIds: [],
      },
    ],
  },
  {
    id: "follower-freebie",
    title: "Follower Freebie (DM/Comment)",
    description: "Check if user follows before sending freebie. If not following, ask them to follow first. Automatically sends freebie when they follow.",
    category: "flow",
    tags: ["follower", "freebie", "dm", "comment", "conditional"],
    goal: "grow",
    trigger: "dm",
    badge: "NEW",
    triggerType: "DM_RECEIVED",
    preview: {
      businessValue: "Grow your following while rewarding engagement. Only send freebies to followers, automatically handling the follow process.",
      howItWorks: "When someone DMs or comments, check if they follow. If yes → send freebie. If no → ask to follow, then automatically send freebie when they follow.",
      conversationMessages: [
        { type: "received", text: "Hey! Can I get the freebie?" },
        { type: "sent", text: "Hey! Thanks for reaching out! 🎉 First, follow us @[username] to get your freebie, then we'll send it right over!" },
        { type: "sent", text: "Thanks for following! Here's your freebie: [FREEBIE_LINK] Enjoy! 🎁", highlight: true },
      ],
    },
    nodes: [
      {
        nodeId: "trigger-dm",
        type: AutomationNodeType.TRIGGER_DM,
        position: { x: 100, y: 100 },
        config: {},
        nextNodeIds: ["condition-follower"],
      },
      {
        nodeId: "condition-follower",
        type: AutomationNodeType.ACTION_CONDITION,
        position: { x: 350, y: 100 },
        config: {
          condition: {
            fieldType: "follower",
            operator: "is_following",
          },
        },
        nextNodeIds: ["action-send-freebie", "action-ask-follow"],
      },
      {
        nodeId: "action-send-freebie",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 600, y: 50 },
        config: {
          message: "Thanks for following! Here's your freebie: [FREEBIE_LINK] Enjoy! 🎁",
        },
        nextNodeIds: [],
      },
      {
        nodeId: "action-ask-follow",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 600, y: 150 },
        config: {
          message: "Hey! Thanks for reaching out! 🎉 First, follow us @[username] to get your freebie, then we'll send it right over!",
        },
        nextNodeIds: ["action-set-tag"],
      },
      {
        nodeId: "action-set-tag",
        type: AutomationNodeType.ACTION_SET_VARIABLE,
        position: { x: 850, y: 150 },
        config: {
          addTag: "waitingForFreebie",
        },
        nextNodeIds: [],
      },
    ],
  },
  {
    id: "follower-freebie-comment",
    title: "Follower Freebie (Comment)",
    description: "Same as Follower Freebie but triggered by comments instead of DMs",
    category: "flow",
    tags: ["follower", "freebie", "comment", "conditional"],
    goal: "grow",
    trigger: "comment",
    badge: "NEW",
    triggerType: "COMMENT_POST",
    preview: {
      businessValue: "Turn comments into followers. Only send freebies to followers, automatically handling the follow process.",
      howItWorks: "When someone comments, check if they follow. If yes → send freebie DM. If no → ask to follow, then automatically send freebie when they follow.",
      conversationMessages: [
        { type: "received", text: "Can I get the freebie?" },
        { type: "sent", text: "Hey! Thanks for reaching out! 🎉 First, follow us @[username] to get your freebie, then we'll send it right over!" },
        { type: "sent", text: "Thanks for following! Here's your freebie: [FREEBIE_LINK] Enjoy! 🎁", highlight: true },
      ],
    },
    nodes: [
      {
        nodeId: "trigger-comment",
        type: AutomationNodeType.TRIGGER_COMMENT,
        position: { x: 100, y: 100 },
        config: {},
        nextNodeIds: ["condition-follower"],
      },
      {
        nodeId: "condition-follower",
        type: AutomationNodeType.ACTION_CONDITION,
        position: { x: 350, y: 100 },
        config: {
          condition: {
            fieldType: "follower",
            operator: "is_following",
          },
        },
        nextNodeIds: ["action-send-freebie", "action-ask-follow"],
      },
      {
        nodeId: "action-send-freebie",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 600, y: 50 },
        config: {
          message: "Thanks for following! Here's your freebie: [FREEBIE_LINK] Enjoy! 🎁",
        },
        nextNodeIds: [],
      },
      {
        nodeId: "action-ask-follow",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 600, y: 150 },
        config: {
          message: "Hey! Thanks for reaching out! 🎉 First, follow us @[username] to get your freebie, then we'll send it right over!",
        },
        nextNodeIds: ["action-set-tag"],
      },
      {
        nodeId: "action-set-tag",
        type: AutomationNodeType.ACTION_SET_VARIABLE,
        position: { x: 850, y: 150 },
        config: {
          addTag: "waitingForFreebie",
        },
        nextNodeIds: [],
      },
    ],
  },
  {
    id: "respond-all-dms",
    title: "Respond to all your DMs",
    description: "Auto-send customized replies when people DM you",
    category: "flow",
    tags: ["dm", "reply", "auto"],
    goal: "engage",
    trigger: "dm",
    triggerType: "DM_RECEIVED",
    preview: {
      businessValue: "Never leave a DM unanswered. Instant responses keep your audience engaged and show you care.",
      howItWorks: "Every DM gets an immediate, friendly response. Perfect for acknowledging messages while you're busy.",
      conversationMessages: [
        { type: "received", text: "Hey! Do you offer consultations?" },
        { type: "sent", text: "Thanks for reaching out! We'll get back to you soon. 😊" },
      ],
    },
    nodes: [
      {
        nodeId: "trigger-dm",
        type: AutomationNodeType.TRIGGER_DM,
        position: { x: 250, y: 100 },
        config: {},
        nextNodeIds: ["action-auto-reply"],
      },
      {
        nodeId: "action-auto-reply",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 250, y: 250 },
        config: {
          message: "Thanks for reaching out! We'll get back to you soon. 😊",
        },
        nextNodeIds: [],
      },
    ],
  },
  {
    id: "affiliate-product-links",
    title: "Send affiliate product links",
    description: "Include product card with photos and links of your affiliate collabs",
    category: "flow",
    tags: ["affiliate", "product", "link"],
    goal: "convert",
    trigger: "dm",
    triggerType: "DM_RECEIVED",
    triggerKeywords: ["product", "buy", "affiliate"],
    triggerMatchType: "ANY",
    preview: {
      businessValue: "Monetize DM conversations by delivering affiliate links and product recommendations on autopilot.",
      howItWorks: "When followers ask about products or collabs in DMs, send them direct affiliate links instantly.",
      conversationMessages: [
        { type: "received", text: "Where did you get that jacket? Affiliate link?" },
        { type: "sent", text: "Check out this amazing product: [AFFILIATE_LINK]" },
      ],
    },
    nodes: [
      {
        nodeId: "trigger-dm",
        type: AutomationNodeType.TRIGGER_DM,
        position: { x: 250, y: 100 },
        config: {},
        nextNodeIds: ["action-send-affiliate"],
      },
      {
        nodeId: "action-send-affiliate",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 250, y: 250 },
        config: {
          message: "Check out this amazing product: [AFFILIATE_LINK]",
        },
        nextNodeIds: [],
      },
    ],
  },
  {
    id: "grow-email-list",
    title: "Grow your email list",
    description: "Ask for email, wait for their reply, and capture it to your contact list",
    category: "flow",
    tags: ["email", "lead", "collect"],
    goal: "convert",
    trigger: "dm",
    triggerType: "DM_RECEIVED",
    triggerKeywords: ["email", "subscribe", "newsletter"],
    triggerMatchType: "ANY",
    preview: {
      businessValue: "Turn Instagram followers into owned email subscribers with zero manual data entry.",
      howItWorks: "When someone asks to subscribe, Instance asks for their email, waits for their reply, and logs it to your contact list.",
      conversationMessages: [
        { type: "received", text: "I'd love to join your newsletter!" },
        { type: "sent", text: "Thanks! Please send us your email to receive exclusive content and updates! 📧" },
        { type: "received", text: "alex@example.com" },
        { type: "sent", text: "You're subscribed! Welcome aboard 🎉" },
      ],
    },
    nodes: [
      {
        nodeId: "trigger-dm",
        type: AutomationNodeType.TRIGGER_DM,
        position: { x: 250, y: 100 },
        config: { keywords: ["email", "subscribe", "newsletter"], matchType: "ANY" },
        nextNodeIds: ["action-ask-email"],
      },
      {
        nodeId: "action-ask-email",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 250, y: 250 },
        config: {
          message: "Thanks! Please send us your email to receive exclusive content and updates! 📧",
          waitForReplyAfterSend: true,
          captureEmail: true,
        },
        nextNodeIds: [],
      },
    ],
  },
  {
    id: "run-giveaway",
    title: "Run a giveaway",
    description: "Run a giveaway to grow Instagram followers. Want your IG comment section to explode?",
    category: "flow",
    tags: ["giveaway", "contest", "grow"],
    goal: "grow",
    trigger: "comment",
    triggerType: "COMMENT_POST",
    preview: {
      businessValue: "Giveaways are engagement magnets. Automate entries and confirmations so you can focus on picking winners.",
      howItWorks: "When someone comments to enter, they're automatically registered and get a confirmation DM. Easy to manage, impossible to miss.",
      conversationMessages: [
        { type: "received", text: "I want to win! 🙋" },
        { type: "sent", text: "You're entered into our giveaway! Good luck! 🎉" },
        { type: "sent", text: "We'll announce the winner on [DATE]!" },
      ],
    },
    nodes: [
      {
        nodeId: "trigger-comment",
        type: AutomationNodeType.TRIGGER_COMMENT,
        position: { x: 250, y: 100 },
        config: {},
        nextNodeIds: ["action-giveaway-entry"],
      },
      {
        nodeId: "action-giveaway-entry",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 250, y: 250 },
        config: {
          message: "You're entered into our giveaway! Good luck! 🎉",
        },
        nextNodeIds: [],
      },
    ],
  },

  // ADVANCED TEMPLATES WITH COMPLEX FLOWS
  {
    id: "lead-qualifier-funnel",
    title: "Qualify inbound leads with a DM funnel",
    description: "Structured DM flow that asks lead volume, pain points, tools, team size, and booking intent. Uses conditions, tags, and a final call link.",
    category: "flow",
    tags: ["dm", "qualify", "sales", "funnel", "tags"],
    goal: "qualify",
    trigger: "dm",
    triggerType: "DM_RECEIVED",
    triggerKeywords: ["help", "leads", "lead", "qualify"],
    triggerMatchType: "ANY",
    preview: {
      businessValue: "Quickly segment inbound DMs into qualified vs. not-yet-ready leads and guide the interested ones to a call link.",
      howItWorks: "DM keyword triggers a short quiz: lead volume, pain point, tools, team size, and interest. Branches for low vs. high leads, tags contacts, and ends with a call link if interested.",
      conversationMessages: [
        { type: "received", text: "help" },
        { type: "sent", text: "Hey! How many leads/month do you get? <100 / 100-500 / 500+" },
        { type: "received", text: "<100", highlight: true },
        { type: "sent", text: "Got it. What's the biggest blocker right now?" },
        { type: "sent", text: "Want us to review your funnel? Grab a free call: [CALL_LINK]" }
      ],
    },
    nodes: [
      // Trigger on DM keywords
      {
        nodeId: "trigger-dm-lead-qual",
        type: AutomationNodeType.TRIGGER_DM,
        position: { x: 100, y: 50 },
        config: { keywords: ["help", "lead", "leads", "qualify"], matchType: "ANY" },
        nextNodeIds: ["ask-leads"],
      },
      // Ask lead volume
      {
        nodeId: "ask-leads",
        type: AutomationNodeType.ACTION_REPLY_DM,
        position: { x: 350, y: 50 },
        config: {
          message: "Hey! Quick check-in:\n\nHow many leads/month are you getting right now?\n\nA) <100\nB) 100-500\nC) 500+\n\nReply with A, B, or C."
        },
        nextNodeIds: ["cond-leads"],
      },
      // Branch on lead volume (basic contains matching)
      {
        nodeId: "cond-leads",
        type: AutomationNodeType.ACTION_CONDITION,
        position: { x: 850, y: 50 },
        config: {
          condition: {
            fieldType: "variable",
            variable: "messageText",
            operator: "contains",
            value: "C"
          }
        },
        nextNodeIds: ["path-high-leads", "path-low-leads"],
      },
      // High leads path (500+)
      {
        nodeId: "path-high-leads",
        type: AutomationNodeType.ACTION_REPLY_DM,
        position: { x: 1100, y: -100 },
        config: {
          message: "Nice volume! 💪 What's the main blocker to growing faster? (conversion, team capacity, tooling, other?)"
        },
        nextNodeIds: ["ask-tools-team-high"],
      },
      // Low/medium leads path (<500)
      {
        nodeId: "path-low-leads",
        type: AutomationNodeType.ACTION_REPLY_DM,
        position: { x: 1100, y: 200 },
        config: {
          message: "Got it. What's holding lead flow back right now? (traffic, offer, follow-up, other?)"
        },
        nextNodeIds: ["ask-tools-team-low"],
      },
      // Ask tools/team (shared logic for high)
      {
        nodeId: "ask-tools-team-high",
        type: AutomationNodeType.ACTION_REPLY_DM,
        position: { x: 1350, y: -100 },
        config: {
          message: "What tools do you use for lead gen + follow-up? And how many people work on it?"
        },
        nextNodeIds: ["tag-high-lead"],
      },
      // Ask tools/team (shared logic for low)
      {
        nodeId: "ask-tools-team-low",
        type: AutomationNodeType.ACTION_REPLY_DM,
        position: { x: 1350, y: 200 },
        config: {
          message: "What tools do you use for lead gen + follow-up? And how many people work on it?"
        },
        nextNodeIds: ["tag-low-lead"],
      },
      // Tagging for segmentation
      {
        nodeId: "tag-high-lead",
        type: AutomationNodeType.ACTION_SET_VARIABLE,
        position: { x: 1850, y: -100 },
        config: {
          addTag: "lead_high_volume",
          variable: "lead_segment",
          value: "high_volume"
        },
        nextNodeIds: ["ask-close-rate"],
      },
      {
        nodeId: "tag-low-lead",
        type: AutomationNodeType.ACTION_SET_VARIABLE,
        position: { x: 1850, y: 200 },
        config: {
          addTag: "lead_low_volume",
          variable: "lead_segment",
          value: "low_volume"
        },
        nextNodeIds: ["ask-close-rate"],
      },
      // Ask close rate (merged path)
      {
        nodeId: "ask-close-rate",
        type: AutomationNodeType.ACTION_REPLY_DM,
        position: { x: 2100, y: 50 },
        config: {
          message: "How are you closing right now? What's your close rate? (e.g., 10%, 20%+)\n\nHave you ever tried Instants.sales yet?"
        },
        nextNodeIds: ["ask-interest-call"],
      },
      // Ask interest / call CTA
      {
        nodeId: "ask-interest-call",
        type: AutomationNodeType.ACTION_REPLY_DM,
        position: { x: 2600, y: 50 },
        config: {
          message: "Sounds good. Want me to review your funnel and share a quick plan to increase lead quality + close rate?\n\nIf yes, I’ll drop a free call link. If not, just say pass."
        },
        nextNodeIds: ["cond-interest"],
      },
      // Condition on interest (simple contains yes)
      {
        nodeId: "cond-interest",
        type: AutomationNodeType.ACTION_CONDITION,
        position: { x: 3100, y: 50 },
        config: {
          condition: {
            fieldType: "variable",
            variable: "messageText",
            operator: "contains",
            value: "yes"
          }
        },
        nextNodeIds: ["send-call-link", "end-not-interested"],
      },
      {
        nodeId: "send-call-link",
        type: AutomationNodeType.ACTION_REPLY_DM,
        position: { x: 3350, y: -50 },
        config: {
          message: "Great! Grab a slot here: [CALL_LINK]\n\nWe'll map your lead flow, follow-up, and quick wins in 15 minutes. 🚀"
        },
        nextNodeIds: ["tag-qualified"],
      },
      {
        nodeId: "end-not-interested",
        type: AutomationNodeType.ACTION_REPLY_DM,
        position: { x: 3350, y: 150 },
        config: {
          message: "No worries! If you ever want a quick review or ideas to boost lead flow, just say \"help\" and I'll be here. 👍"
        },
        nextNodeIds: [],
      },
      // Tag qualified lead after call link
      {
        nodeId: "tag-qualified",
        type: AutomationNodeType.ACTION_SET_VARIABLE,
        position: { x: 3600, y: -50 },
        config: {
          addTag: "lead_qualified",
          variable: "lead_status",
          value: "qualified"
        },
        nextNodeIds: [],
      },
    ],
  },

  {
    id: "qualify-with-quiz",
    title: "Qualify with a quiz",
    description: "People love to talk about themselves. So, let 'em. Quiz 'em, tag 'em, and send the right offer at the right time",
    category: "flow",
    tags: ["quiz", "qualify", "segment", "lead"],
    goal: "qualify",
    trigger: "dm",
    badge: "PRO",
    triggerType: "DM_KEYWORD",
    triggerKeywords: ["quiz", "test", "start"],
    triggerMatchType: "ANY",
    preview: {
      businessValue: "Stop guessing who's hot or not. Segment your admirers from your buyers. Build profiles. Qualify folks for your next big launch — without ever leaving Facebook.",
      howItWorks: "Someone sends you a keyword. You hit back with a few fun, strategic questions. Their answers sort them into your funnels like magic.",
      conversationMessages: [
        { type: "sent", text: "Hey! Which of these best describes you?" },
        { type: "buttons", buttons: ["1️⃣ I'm new to content", "2️⃣ I'm a total pro", "3️⃣ I'm in between"] },
        { type: "received", text: "1", highlight: true },
        { type: "sent", text: "Nice! I have a resource to help you create content faster. Would you like it?" },
        { type: "received", text: "Yes, please! 🙏" },
      ],
    },
    nodes: [
      // Trigger: User sends "quiz" keyword
      {
        nodeId: "trigger-quiz-keyword",
        type: AutomationNodeType.TRIGGER_DM,
        position: { x: 100, y: 50 },
        config: { keywords: ["quiz", "test", "start"] },
        nextNodeIds: ["condition-quiz-started"],
      },
      // Condition: Check if quiz already started
      {
        nodeId: "condition-quiz-started",
        type: AutomationNodeType.ACTION_CONDITION,
        position: { x: 350, y: 50 },
        config: {
          condition: {
            fieldType: "tag",
            tag: "quiz_started",
            operator: "not_has_tag"
          }
        },
        nextNodeIds: ["set-quiz-started", "already-taken-message"],
      },
      // Action: Set quiz_started tag
      {
        nodeId: "set-quiz-started",
        type: AutomationNodeType.ACTION_SET_VARIABLE,
        position: { x: 600, y: 50 },
        config: {
          variable: "quiz_started",
          value: "true",
          addTag: "quiz_started"
        },
        nextNodeIds: ["question-1"],
      },
      // Question 1: Experience level
      {
        nodeId: "question-1",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 850, y: 50 },
        config: {
          message: "Let the games begin! Answer these 3 questions to check your IG mastery level. (Answer 2 of 3 correctly to get a special gift! 🎁)\n\n#1: What's the worst way to grow on Instagram?",
          buttons: [
            { title: "Buying followers", type: "reply" },
            { title: "DM automation", type: "reply" },
            { title: "Daily stories/posts", type: "reply" }
          ]
        },
        nextNodeIds: ["condition-q1-answer"],
      },
      // Check Q1 answer
      {
        nodeId: "condition-q1-answer",
        type: AutomationNodeType.ACTION_CONDITION,
        position: { x: 1350, y: 50 },
        config: {
          condition: {
            fieldType: "variable",
            variable: "messageText",
            operator: "contains",
            value: "Buying followers"
          }
        },
        nextNodeIds: ["q1-correct", "q1-wrong"],
      },
      // Q1 Wrong answer
      {
        nodeId: "q1-wrong",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 1350, y: -150 },
        config: {
          message: "Oops! 😅\n\nPosting frequently and combining it with DM automation with Instance is actually the best way to grow! We were looking for \"Buying followers.\" 👉"
        },
        nextNodeIds: ["set-score-q1-wrong"],
      },
      // Q1 Correct answer
      {
        nodeId: "q1-correct",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 1350, y: 200 },
        config: {
          message: "Let's GO! Buying followers is definitely the worst way. Posting frequently and combining it with Instance's DM automation can SKYROCKET your account! 😎"
        },
        nextNodeIds: ["set-score-q1-correct"],
      },
      // Set score for Q1
      {
        nodeId: "set-score-q1-wrong",
        type: AutomationNodeType.ACTION_SET_VARIABLE,
        position: { x: 1600, y: -150 },
        config: {
          variable: "quiz_score",
          value: "0",
          operation: "set"
        },
        nextNodeIds: ["question-2"],
      },
      {
        nodeId: "set-score-q1-correct",
        type: AutomationNodeType.ACTION_SET_VARIABLE,
        position: { x: 1600, y: 200 },
        config: {
          variable: "quiz_score",
          value: "20",
          operation: "add"
        },
        nextNodeIds: ["question-2"],
      },
      // Question 2
      {
        nodeId: "question-2",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 1850, y: 50 },
        config: {
          message: "#2: What's the NEW ratio for Instagram's grid photos? 🐱",
          buttons: [
            { title: "16:9", type: "reply" },
            { title: "4:5", type: "reply" },
            { title: "1:1", type: "reply" }
          ]
        },
        nextNodeIds: ["condition-q2-answer"],
      },
      // Check Q2 answer
      {
        nodeId: "condition-q2-answer",
        type: AutomationNodeType.ACTION_CONDITION,
        position: { x: 2350, y: 50 },
        config: {
          condition: {
            fieldType: "variable",
            variable: "messageText",
            operator: "contains",
            value: "4:5"
          }
        },
        nextNodeIds: ["q2-correct", "q2-wrong"],
      },
      // Q2 Correct
      {
        nodeId: "q2-correct",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 2350, y: 200 },
        config: {
          message: "Heck yes! 💜 Are you a genius? (Don't answer that, we KNOW you are.)"
        },
        nextNodeIds: ["set-score-q2-correct"],
      },
      // Q2 Wrong
      {
        nodeId: "q2-wrong",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 2350, y: -150 },
        config: {
          message: "Not anymore!\n\n1:1 used to be the grid's famed square. But things have changed (you should probably go check).\n\nCorrect answer is 4:5. 💕"
        },
        nextNodeIds: ["set-score-q2-wrong"],
      },
      {
        nodeId: "set-score-q2-correct",
        type: AutomationNodeType.ACTION_SET_VARIABLE,
        position: { x: 2600, y: 200 },
        config: {
          variable: "quiz_score",
          value: "20",
          operation: "add"
        },
        nextNodeIds: ["question-3"],
      },
      {
        nodeId: "set-score-q2-wrong",
        type: AutomationNodeType.ACTION_SET_VARIABLE,
        position: { x: 2600, y: -150 },
        config: {
          variable: "quiz_score",
          value: "0",
          operation: "add"
        },
        nextNodeIds: ["question-3"],
      },
      // Question 3
      {
        nodeId: "question-3",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 2850, y: 50 },
        config: {
          message: "Last question. Our toughest yet.\n\nWho is the current CEO of Instagram?",
          buttons: [
            { title: "Mark Zuckerberg", type: "reply" },
            { title: "Sheryl Sandberg", type: "reply" },
            { title: "Adam Mosseri", type: "reply" }
          ]
        },
        nextNodeIds: ["condition-q3-answer"],
      },
      // Check Q3 answer
      {
        nodeId: "condition-q3-answer",
        type: AutomationNodeType.ACTION_CONDITION,
        position: { x: 3350, y: 50 },
        config: {
          condition: {
            fieldType: "variable",
            variable: "messageText",
            operator: "contains",
            value: "Adam Mosseri"
          }
        },
        nextNodeIds: ["q3-correct", "q3-wrong"],
      },
      // Q3 Correct
      {
        nodeId: "q3-correct",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 3350, y: 200 },
        config: {
          message: "You're correct! 👏👏👏"
        },
        nextNodeIds: ["set-score-q3-correct"],
      },
      // Q3 Wrong (Zuckerberg)
      {
        nodeId: "q3-wrong",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 3350, y: -150 },
        config: {
          message: "Nope! Mr. Zuckerberg is the CEO of Meta, not Instagram!\n\n(You can be forgiven for mistaking that one! 😅)"
        },
        nextNodeIds: ["set-score-q3-wrong"],
      },
      {
        nodeId: "set-score-q3-correct",
        type: AutomationNodeType.ACTION_SET_VARIABLE,
        position: { x: 3600, y: 200 },
        config: {
          variable: "quiz_score",
          value: "20",
          operation: "add"
        },
        nextNodeIds: ["calculate-final-score"],
      },
      {
        nodeId: "set-score-q3-wrong",
        type: AutomationNodeType.ACTION_SET_VARIABLE,
        position: { x: 3600, y: -150 },
        config: {
          variable: "quiz_score",
          value: "0",
          operation: "add"
        },
        nextNodeIds: ["calculate-final-score"],
      },
      // Calculate final score and segment
      {
        nodeId: "calculate-final-score",
        type: AutomationNodeType.ACTION_CONDITION,
        position: { x: 3850, y: 50 },
        config: {
          condition: {
            fieldType: "number",
            variable: "quiz_score",
            operator: "greater_than",
            value: "40"
          }
        },
        nextNodeIds: ["winner-path", "consolation-path"],
      },
      // Winner path (40+ points)
      {
        nodeId: "winner-path",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 4100, y: -100 },
        config: {
          message: "Congratulations, you scored 40+ points ❤️ and we're so proud of you!\n\nAnd we think you deserve 10% off to enjoy our expert Instagram course. 🎁\n\nCode:\n#quizguru\n\nNow don't tell anyone... 🤫\n\nCheck out the course details and redeem your discount here. 👇",
          buttons: [{ title: "Try our course!", type: "url", url: "[YOUR_COURSE_LINK]" }]
        },
        nextNodeIds: [],
      },
      // Consolation path
      {
        nodeId: "consolation-path",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 4100, y: 200 },
        config: {
          message: "Hey {name}, you gave it a great shot and we're proud of you anyway. 🤗\n\nLearning new things is filled with challenges and we're happy to have been alongside you for this ride!\n\nBecause you're such a great sport, we wanna share a special 15% off promo code to enjoy our amazing course for fans of Instagram! 🎉\n\nUse this code at checkout:\n\nquizrocket\n\nCheck out the course details and redeem the discount here! 👇",
          buttons: [{ title: "Try our course!", type: "url", url: "[YOUR_COURSE_LINK]" }]
        },
        nextNodeIds: [],
      },
      // Already taken quiz message
      {
        nodeId: "already-taken-message",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 350, y: 250 },
        config: {
          message: "Looks like you have already taken the quiz! Sorry, friend!"
        },
        nextNodeIds: [],
      },
      // Flow ends
    ],
  },
  // DM Your Course Like a Closer
  {
    id: "dm-course-closer",
    title: "DM your course like a closer",
    description: "Give followers early access to a new launch. Instagram launch day chaos? Not anymore.",
    category: "flow",
    tags: ["course", "launch", "sales", "dm"],
    goal: "convert",
    trigger: "dm",
    triggerType: "DM_KEYWORD",
    triggerKeywords: ["course", "launch", "early", "access"],
    triggerMatchType: "ANY",
    preview: {
      businessValue: "Turn your DMs into a sales machine. Early access creates urgency. Automated follow-ups close the deal while you sleep.",
      howItWorks: "When someone DMs a keyword, they get instant access to your launch. Automated sequences nurture and convert them without lifting a finger.",
      conversationMessages: [
        { type: "received", text: "EARLY" },
        { type: "sent", text: "You're in! 🎉 Here's your exclusive early access link..." },
        { type: "sent", text: "P.S. This price expires in 48 hours ⏰" },
      ],
    },
    nodes: [
      {
        nodeId: "trigger-course",
        type: AutomationNodeType.TRIGGER_DM,
        position: { x: 100, y: 100 },
        config: { keywords: ["course", "launch", "early", "access"] },
        nextNodeIds: ["welcome-early-access"],
      },
      {
        nodeId: "welcome-early-access",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 350, y: 100 },
        config: {
          message: "You're in! 🎉\n\nHere's your exclusive early access to [COURSE_NAME]:\n\n[COURSE_LINK]\n\nThis special price is only available for the next 48 hours!"
        },
        nextNodeIds: [],
      },
    ],
  },
  // Answer FAQs from Story Replies
  {
    id: "answer-faqs-story",
    title: "Answer FAQs from story replies",
    description: "Reply to your followers' questions ASAP",
    category: "flow",
    tags: ["story", "faq", "support", "reply"],
    goal: "engage",
    trigger: "story",
    triggerType: "STORY_REPLY",
    preview: {
      businessValue: "Never miss a story reply again. Instant answers build trust and keep your audience engaged around the clock.",
      howItWorks: "When someone replies to your story, they instantly get helpful info. Common questions get smart, personalized responses.",
      conversationMessages: [
        { type: "received", text: "What time is your live?" },
        { type: "sent", text: "Great question! My next live is tomorrow at 3PM EST! Set a reminder 🔔" },
      ],
    },
    nodes: [
      {
        nodeId: "trigger-story-reply",
        type: AutomationNodeType.TRIGGER_STORY,
        position: { x: 100, y: 100 },
        config: {},
        nextNodeIds: ["check-faq-type"],
      },
      {
        nodeId: "check-faq-type",
        type: AutomationNodeType.ACTION_CONDITION,
        position: { x: 350, y: 100 },
        config: {
          condition: {
            fieldType: "variable",
            variable: "messageText",
            operator: "contains",
            value: "price",
          },
        },
        nextNodeIds: ["pricing-response", "general-response"],
      },
      {
        nodeId: "pricing-response",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 600, y: 0 },
        config: {
          message: "Thanks for asking about pricing! 💰\n\nYou can find all our packages and prices here: [PRICING_LINK]\n\nLet me know if you have any questions!"
        },
        nextNodeIds: [],
      },
      {
        nodeId: "general-response",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 600, y: 200 },
        config: {
          message: "Thanks for reaching out! 😊\n\nI'll get back to you personally soon. In the meantime, check out our FAQ: [FAQ_LINK]"
        },
        nextNodeIds: [],
      },
    ],
  },
  // Give Coupons in Stories
  {
    id: "give-coupons-stories",
    title: "Give coupons in stories",
    description: "Someone watched your story? Treat 'em like a VIP with a secret DM coupon",
    category: "flow",
    tags: ["story", "coupon", "discount", "vip"],
    goal: "convert",
    trigger: "story",
    triggerType: "STORY_REPLY",
    preview: {
      businessValue: "Reward engagement instantly. Story viewers become buyers when they feel like VIPs.",
      howItWorks: "When someone replies to your story, they get an exclusive coupon code delivered straight to their DMs.",
      conversationMessages: [
        { type: "received", text: "Love this! 😍" },
        { type: "sent", text: "Thanks so much! 💕 Here's a secret VIP code just for you: STORY20\n\nUse it for 20% off your next order!" },
      ],
    },
    nodes: [
      {
        nodeId: "trigger-story",
        type: AutomationNodeType.TRIGGER_STORY,
        position: { x: 100, y: 100 },
        config: {},
        nextNodeIds: ["send-coupon"],
      },
      {
        nodeId: "send-coupon",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 350, y: 100 },
        config: {
          message: "Thanks so much for watching! 💕\n\nHere's a secret VIP code just for you: [COUPON_CODE]\n\nUse it for [DISCOUNT]% off your next order!\n\nShop now: [SHOP_LINK]"
        },
        nextNodeIds: ["add-vip-tag"],
      },
      {
        nodeId: "add-vip-tag",
        type: AutomationNodeType.ACTION_SET_VARIABLE,
        position: { x: 600, y: 100 },
        config: {
          addTag: "story_vip",
          variable: "received_coupon",
          value: "true"
        },
        nextNodeIds: [],
      },
    ],
  },
  // Sell from Reel Comments
  {
    id: "sell-reel-comments",
    title: "Sell from Reel comments",
    description: "A reel got people talking? Slide into their DMs with something worth buying",
    category: "flow",
    tags: ["reel", "comment", "sales", "product"],
    goal: "convert",
    trigger: "comment",
    triggerType: "COMMENT_REEL",
    preview: {
      businessValue: "Turn viral moments into sales. When your Reel blows up, automatically convert commenters into customers.",
      howItWorks: "When someone comments on your Reel, they get a DM with your product link and a special offer.",
      conversationMessages: [
        { type: "received", text: "Need this!! Where can I get it?" },
        { type: "sent", text: "Glad you love it! 🎉\n\nHere's the link: [LINK]\n\nUse code REEL15 for 15% off!" },
      ],
    },
    nodes: [
      {
        nodeId: "trigger-reel-comment",
        type: AutomationNodeType.TRIGGER_COMMENT,
        position: { x: 100, y: 100 },
        config: { mediaType: "REEL", autoLikeComment: true },
        nextNodeIds: ["send-product-dm"],
      },
      {
        nodeId: "send-product-dm",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 350, y: 100 },
        config: {
          delayEnabled: true,
          delaySeconds: 2,
          typingIndicator: true,
          message: "Glad you love the Reel! 🎉\n\nHere's where you can get it: [PRODUCT_LINK]\n\nUse code REEL15 for 15% off your order! 💰"
        },
        nextNodeIds: ["reply-to-comment"],
      },
      {
        nodeId: "reply-to-comment",
        type: AutomationNodeType.ACTION_REPLY_COMMENT,
        position: { x: 600, y: 100 },
        config: {
          message: "Check your DMs! 📩✨"
        },
        nextNodeIds: [],
      },
    ],
  },

  // Turn Comments into RSVPs
  {
    id: "comments-to-rsvps",
    title: "Turn comments into RSVPs",
    description: "\"Comment to join\" becomes \"You're registered.\" No forms, no fuss",
    category: "flow",
    tags: ["comment", "rsvp", "event", "register"],
    goal: "convert",
    trigger: "comment",
    triggerType: "COMMENT_POST",
    triggerKeywords: ["join", "in", "register", "me", "interested"],
    triggerMatchType: "ANY",
    preview: {
      businessValue: "Fill your events without friction. Comments become registrations instantly.",
      howItWorks: "When someone comments a keyword like 'JOIN', they're automatically registered and receive confirmation in their DMs.",
      conversationMessages: [
        { type: "received", text: "JOIN" },
        { type: "sent", text: "You're in! 🎉\n\nYou've been registered for [EVENT_NAME].\n\nDate: [DATE]\nTime: [TIME]\n\nAdd it to your calendar! 📅" },
      ],
    },
    nodes: [
      {
        nodeId: "trigger-rsvp-comment",
        type: AutomationNodeType.TRIGGER_COMMENT,
        position: { x: 100, y: 100 },
        config: { keywords: ["join", "in", "register", "me", "interested"] },
        nextNodeIds: ["register-user"],
      },
      {
        nodeId: "register-user",
        type: AutomationNodeType.ACTION_SET_VARIABLE,
        position: { x: 350, y: 100 },
        config: {
          addTag: "event_registered",
          variable: "event_rsvp",
          value: "confirmed"
        },
        nextNodeIds: ["send-confirmation"],
      },
      {
        nodeId: "send-confirmation",
        type: AutomationNodeType.ACTION_SEND_DM,
        position: { x: 600, y: 100 },
        config: {
          message: "You're in! 🎉\n\nYou've been registered for [EVENT_NAME].\n\n📅 Date: [DATE]\n⏰ Time: [TIME]\n📍 Where: [LOCATION/LINK]\n\nWe'll send you a reminder before it starts!"
        },
        nextNodeIds: ["reply-comment-confirm"],
      },
      {
        nodeId: "reply-comment-confirm",
        type: AutomationNodeType.ACTION_REPLY_COMMENT,
        position: { x: 850, y: 100 },
        config: {
          message: "You're registered! Check your DMs for details 📩"
        },
        nextNodeIds: [],
      },
    ],
  },
];

// Helper functions
export function getTemplatesByGoal(goal: string): AutomationTemplate[] {
  if (goal === "all") return AUTOMATION_TEMPLATES;
  return AUTOMATION_TEMPLATES.filter((t) => t.goal === goal);
}

export function getTemplatesByTrigger(trigger: string): AutomationTemplate[] {
  if (trigger === "all") return AUTOMATION_TEMPLATES;
  return AUTOMATION_TEMPLATES.filter((t) => t.trigger === trigger);
}

export function searchTemplates(query: string): AutomationTemplate[] {
  const lowerQuery = query.toLowerCase();
  return AUTOMATION_TEMPLATES.filter(
    (t) =>
      t.title.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

export function getTemplateById(id: string): AutomationTemplate | undefined {
  return AUTOMATION_TEMPLATES.find((t) => t.id === id);
}
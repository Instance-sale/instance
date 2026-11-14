"use client";

import { useState, useEffect, useRef } from "react";
import { Node, Edge } from "@xyflow/react";
import { ChatButton, ChatMessage } from "./types";

interface UseSimulationEngineParams {
  nodes: Node[];
  edges: Edge[];
  userName?: string;
  isOpen: boolean;
  onClose?: () => void;
}

export function useSimulationEngine({
  nodes,
  edges,
  userName = "instance",
  isOpen,
  onClose,
}: UseSimulationEngineParams) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [simulatedIsFollowing, setSimulatedIsFollowing] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Find trigger and first action node
  const startSimulation = () => {
    if (!nodes || nodes.length === 0) {
      setMessages([
        {
          id: "empty",
          sender: "business",
          text: "Start building your automation flow on the canvas to test it in this simulator.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    const triggerNode = nodes.find(
      (n) =>
        (n.data?.type as string)?.startsWith("TRIGGER_") ||
        n.type === "trigger"
    );

    const initialMessages: ChatMessage[] = [];

    // Construct trigger message based on trigger type
    const triggerType = (triggerNode?.data?.type as string) || "TRIGGER_DM";
    const triggerConfig = (triggerNode?.data?.config as any) || {};

    let triggerText = "Hello! I saw your post and wanted more details.";
    let contextTag: string | undefined = undefined;

    if (triggerType === "TRIGGER_COMMENT") {
      triggerText = "Love this product! Where can I get it? 🔥";
      contextTag = "Commented on your reel";
    } else if (triggerType === "TRIGGER_STORY") {
      const storyType = triggerConfig?.storyType || "mention";
      if (storyType === "mention") {
        triggerText = "Tagged @instance in their story! 📸";
        contextTag = "Mentioned you in their story";
      } else if (storyType === "reaction") {
        triggerText = (triggerConfig?.storyEmojis?.[0]) || "🔥";
        contextTag = "Reacted to your story";
      } else {
        triggerText = triggerConfig?.keywords?.[0] || "This looks amazing! Can I get the link? 😍";
        contextTag = "Replied to your story";
      }
    } else if (triggerType === "TRIGGER_FOLLOWER") {
      triggerText = "Followed your profile! 👤";
      contextTag = "Started following you";
    } else if (triggerConfig?.keywords && triggerConfig.keywords.length > 0) {
      triggerText = triggerConfig.keywords[0];
      contextTag = "Sent keyword in DM";
    }

    initialMessages.push({
      id: "trigger-msg",
      sender: "user",
      text: triggerText,
      contextTag,
      isTrigger: true,
      timestamp: new Date(),
    });

    setMessages(initialMessages);
    setIsTyping(true);

    // Locate the first action connected to trigger
    let firstActionNode: Node | undefined = undefined;

    if (triggerNode) {
      const connectedEdge = edges.find((e) => e.source === triggerNode.id);
      if (connectedEdge) {
        firstActionNode = nodes.find((n) => n.id === connectedEdge.target);
      }
      if (!firstActionNode && (triggerNode.data as any)?.nextNodeIds?.length > 0) {
        firstActionNode = nodes.find(
          (n) => n.id === (triggerNode.data as any).nextNodeIds[0]
        );
      }
    }

    if (!firstActionNode) {
      // Fallback: first ACTION node found in nodes list
      firstActionNode = nodes.find((n) =>
        (n.data?.type as string)?.startsWith("ACTION_")
      );
    }

    // Execute first action after a brief realistic typing delay
    setTimeout(() => {
      setIsTyping(false);
      if (firstActionNode) {
        executeNode(firstActionNode, initialMessages);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: "default-reply",
            sender: "business",
            text: "Thanks for reaching out! We will get back to you shortly. 😊",
            timestamp: new Date(),
          },
        ]);
      }
    }, 700);
  };

  // Reset/start on open
  useEffect(() => {
    if (isOpen) {
      startSimulation();
    }
  }, [isOpen, nodes, edges]);

  // Execute a specific node in the flow
  const executeNode = (node: Node, currentHistory: ChatMessage[]) => {
    setCurrentNodeId(node.id);
    const nodeType = node.data?.type as string;
    const config = (node.data?.config as any) || {};

    if (nodeType === "ACTION_SEND_DM" || nodeType === "ACTION_REPLY_DM") {
      const activeVariations = (Array.isArray(config.messageVariations)
        ? config.messageVariations.map((v: any) => (typeof v === "string" ? v : v?.text))
        : []
      ).filter((v: any) => typeof v === "string" && v.trim().length > 0);
      const candidateTexts = activeVariations.length > 0
        ? activeVariations
        : [config.message].filter(Boolean);
      const rawText =
        candidateTexts.length > 0
          ? candidateTexts[Math.floor(Math.random() * candidateTexts.length)]
          : "Hello! Thanks for your interest. How can we help you today?";
      // Replace placeholders
      const text = rawText
        .replace(/{name}/g, "Alex")
        .replace(/{username}/g, "alex_dev")
        .replace(/{comment}/g, "Love this!")
        .replace(/{promo_code}/gi, "STORY-8492")
        .replace(/{{promo_code}}/gi, "STORY-8492")
        .replace(/{promo}/gi, "STORY-8492")
        .replace(/{{promo}}/gi, "STORY-8492");

      // Map buttons
      let buttons: ChatButton[] = [];
      if (config.buttons && Array.isArray(config.buttons)) {
        const defaultEdge = edges.find(
          (e) => e.source === node.id && (!e.sourceHandle || e.sourceHandle === "default")
        );
        buttons = config.buttons.map((btn: any, idx: number) => {
          if (btn.type === "link") {
            return {
              title: btn.title || `Option ${idx + 1}`,
              type: "link",
              url: btn.url,
              targetNodeId: undefined,
            };
          }

          const isBranched = Boolean(btn.enableBranch);
          const specificEdge = isBranched
            ? edges.find(
                (e) =>
                  e.source === node.id &&
                  (e.sourceHandle === `button-${idx}` || e.sourceHandle === `handle-${idx}`)
              )
            : undefined;

          return {
            title: btn.title || `Option ${idx + 1}`,
            type: "reply",
            url: btn.url,
            targetNodeId: specificEdge?.target || defaultEdge?.target,
          };
        });
      }

      const isCarousel = config.messageFormat === "carousel" || (Array.isArray(config.carouselCards) && config.carouselCards.length > 0);
      const carouselCards = isCarousel && Array.isArray(config.carouselCards) && config.carouselCards.length > 0
        ? config.carouselCards.map((card: any) => ({
            id: card.id,
            title: card.title,
            subtitle: card.subtitle,
            imageUrl: card.imageUrl || card.image_url,
            buttons: Array.isArray(card.buttons)
              ? card.buttons.map((b: any) => ({
                  title: b.title,
                  type: b.type === "link" ? "link" : "reply",
                  url: b.url,
                  targetNodeId: undefined,
                }))
              : [],
          }))
        : undefined;

      setMessages([
        ...currentHistory,
        {
          id: `msg-${Date.now()}`,
          sender: "business",
          text: isCarousel ? (config.message || "") : text,
          buttons: isCarousel ? undefined : buttons,
          carouselCards,
          buttonStyle: config.buttonStyle || "buttons",
          timestamp: new Date(),
          mediaType: config.mediaType || (config.mediaUrl ? "IMAGE" : "TEXT"),
          mediaUrl: config.mediaUrl,
        },
      ]);
    } else if (nodeType === "ACTION_REPLY_COMMENT") {
      const activeVariations = (Array.isArray(config.messageVariations)
        ? config.messageVariations.map((v: any) => (typeof v === "string" ? v : v?.text))
        : []
      ).filter((v: any) => typeof v === "string" && v.trim().length > 0);
      const candidateTexts = activeVariations.length > 0
        ? activeVariations
        : [config.message || config.text].filter(Boolean);
      const rawText =
        candidateTexts.length > 0
          ? candidateTexts[Math.floor(Math.random() * candidateTexts.length)]
          : "Thanks for your comment! 😊 Check your DMs for details.";
      const text = rawText
        .replace(/{name}/g, "Alex")
        .replace(/{username}/g, "alex_dev")
        .replace(/{comment}/g, "Love this!");

      const updatedHistory: ChatMessage[] = [...currentHistory];
      if (config.autoLikeComment) {
        updatedHistory.push({
          id: `comment-like-${Date.now()}`,
          sender: "business",
          text: `❤️ [Auto-Liked @alex_dev's Comment]`,
          timestamp: new Date(),
        });
      }
      updatedHistory.push({
        id: `comment-reply-${Date.now() + 1}`,
        sender: "business",
        text: `💬 [Public Comment Reply]:\n${text}`,
        timestamp: new Date(),
      });
      setMessages(updatedHistory);

      // Automatically continue to the next connected nodes (e.g. Send DM, Condition, Split, etc.)
      const connectedEdges = edges.filter((e) => e.source === node.id);
      if (connectedEdges.length > 0) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          for (const edge of connectedEdges) {
            const nextNode = nodes.find((n) => n.id === edge.target);
            if (nextNode) {
              executeNode(nextNode, updatedHistory);
            }
          }
        }, 700);
      }
    } else if (nodeType === "ACTION_CONDITION") {
      const lastUserMsg = [...currentHistory].reverse().find((m) => m.sender === "user")?.text || "";

      const evaluateRule = (rule: any): boolean => {
        const fieldType = rule.fieldType || "variable";
        const operator = rule.operator || "equals";
        const compareVal = rule.value;

        if (fieldType === "number") {
          const numToTest = parseFloat(lastUserMsg) || parseFloat(rule.variable) || 0;
          const targetNum = parseFloat(compareVal) || 0;
          switch (operator) {
            case "greater_than": return numToTest > targetNum;
            case "less_than": return numToTest < targetNum;
            case "greater_equal": return numToTest >= targetNum;
            case "less_equal": return numToTest <= targetNum;
            case "not_equals": return numToTest !== targetNum;
            default: return numToTest === targetNum;
          }
        } else if (fieldType === "follower") {
          return operator === "not_following" ? !simulatedIsFollowing : Boolean(simulatedIsFollowing);
        } else if (fieldType === "tag") {
          return operator !== "not_has";
        } else if (fieldType === "pipeline") {
          return operator !== "is_not";
        } else if (fieldType === "boolean") {
          return operator === "equals";
        } else {
          const textToTest = lastUserMsg.trim().toLowerCase();
          const targetText = String(compareVal || "").trim().toLowerCase();
          switch (operator) {
            case "is_set": return textToTest.length > 0;
            case "is_not_set": return textToTest.length === 0;
            case "contains": return textToTest.includes(targetText);
            case "not_contains": return !textToTest.includes(targetText);
            case "startsWith": return textToTest.startsWith(targetText);
            case "endsWith": return textToTest.endsWith(targetText);
            case "not_equals": return textToTest !== targetText;
            default: return textToTest === targetText;
          }
        }
      };

      // Follower gate check in preview
      const isFollowerGate = Boolean(config.isFollowerGate) || (!config.conditionGroups?.length && (config.condition?.fieldType === "follower" || config.fieldType === "follower") && Boolean(config.message || config.condition?.message));
      if (isFollowerGate && !simulatedIsFollowing) {
        const promptText = config.message || config.condition?.message;
        const gateButtons: ChatButton[] = Array.isArray(config.buttons) && config.buttons.length > 0
          ? config.buttons.map((b: any, idx: number) => ({
            title: b.title || `Button ${idx + 1}`,
            type: b.type || "reply",
            url: b.url,
          }))
          : [];

        setCurrentNodeId(node.id);
        if (promptText) {
          const text = promptText
            .replace(/{name}/g, "Alex")
            .replace(/{username}/g, "alex_dev");

          setMessages([
            ...currentHistory,
            {
              id: `gate-msg-${Date.now()}`,
              sender: "business",
              text,
              buttons: gateButtons,
              timestamp: new Date(),
            },
          ]);
        }
        return;
      }

      let isPassed = false;
      const conditionGroups = Array.isArray(config.conditionGroups) && config.conditionGroups.length > 0
        ? config.conditionGroups
        : null;

      if (conditionGroups) {
        const groupResults: boolean[] = [];
        for (const group of conditionGroups) {
          const rules = Array.isArray(group.rules) ? group.rules : [];
          if (rules.length === 0) continue;
          let groupPassed = true;
          if (group.logic === "OR") {
            groupPassed = false;
            for (const r of rules) {
              if (evaluateRule(r)) {
                groupPassed = true;
                break;
              }
            }
          } else {
            for (const r of rules) {
              if (!evaluateRule(r)) {
                groupPassed = false;
                break;
              }
            }
          }
          groupResults.push(groupPassed);
        }

        const groupLogic = config.groupLogic || "OR";
        isPassed = groupLogic === "AND"
          ? groupResults.length > 0 && groupResults.every(Boolean)
          : groupResults.some(Boolean);
      } else {
        const single = config.condition || {};
        isPassed = evaluateRule(single);
      }

      const targetHandle = isPassed ? "true" : "false";
      let chosenEdge = edges.find((e) => e.source === node.id && e.sourceHandle === targetHandle);
      if (!chosenEdge) {
        chosenEdge = edges.find((e) => e.source === node.id);
      }

      if (chosenEdge) {
        const nextNode = nodes.find((n) => n.id === chosenEdge?.target);
        if (nextNode) {
          executeNode(nextNode, currentHistory);
        }
      }
    } else if (nodeType === "FLOW_RANDOM") {
      const pathCount = Math.max(2, Math.min(5, parseInt(config.pathCount, 10) || 2));
      const weightsStr = config.weights || "";
      const weightsArray = weightsStr
        ? weightsStr.split(",").map((w: string) => parseFloat(w.trim())).filter((w: number) => !isNaN(w))
        : Array(pathCount).fill(100 / pathCount);

      const totalWeight = weightsArray.reduce((acc: number, w: number) => acc + w, 0) || 100;
      const randomValue = Math.random() * totalWeight;

      let cumulative = 0;
      let chosenIndex = 0;
      for (let i = 0; i < weightsArray.length; i++) {
        cumulative += weightsArray[i];
        if (randomValue <= cumulative) {
          chosenIndex = i;
          break;
        }
      }

      const chosenHandle = `path-${chosenIndex}`;
      let randomEdge = edges.find((e) => {
        if (e.source !== node.id) return false;
        const handle = e.sourceHandle || (e as any)?.sourceHandleId || "";
        return handle === chosenHandle;
      });
      if (!randomEdge) {
        const connected = edges.filter((e) => e.source === node.id);
        randomEdge = connected.find((e) => {
          const handle = e.sourceHandle || (e as any)?.sourceHandleId || "";
          return handle === chosenHandle;
        }) || connected[chosenIndex % (connected.length || 1)];
      }

      if (randomEdge) {
        const nextNode = nodes.find((n) => n.id === randomEdge?.target);
        if (nextNode) {
          executeNode(nextNode, currentHistory);
        }
      }
    } else if (nodeType === "FLOW_SPLIT") {
      const splitEdges = edges.filter((e) => e.source === node.id);
      for (const edge of splitEdges) {
        const nextNode = nodes.find((n) => n.id === edge.target);
        if (nextNode) {
          executeNode(nextNode, currentHistory);
        }
      }
    } else if (nodeType === "ACTION_SET_VARIABLE") {
      const nextEdge = edges.find((e) => e.source === node.id);
      if (nextEdge) {
        const nextNode = nodes.find((n) => n.id === nextEdge.target);
        if (nextNode) {
          executeNode(nextNode, currentHistory);
        }
      }
    } else {
      // Generic action node
      setMessages([
        ...currentHistory,
        {
          id: `msg-${Date.now()}`,
          sender: "business",
          text: `Action executed: ${node.data?.label || nodeType}`,
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Handle user clicking a quick reply button in simulator
  const handleButtonClick = (btn: ChatButton) => {
    // If it's a URL link button, open link or inform user
    if (btn.type === "url" && btn.url) {
      window.open(btn.url, "_blank");
      return;
    }

    // Add user response
    const userMsg: ChatMessage = {
      id: `user-reply-${Date.now()}`,
      sender: "user",
      text: btn.title,
      timestamp: new Date(),
    };

    // If active message had quick replies, dismiss them on user tap (Instagram native behavior)
    const updatedMessages = messages.map((m) => {
      if (m.buttonStyle === "quick_replies") {
        return { ...m, buttons: [] };
      }
      return m;
    });

    const newHistory = [...updatedMessages, userMsg];
    setMessages(newHistory);
    setIsTyping(true);

    // Find next node
    setTimeout(() => {
      setIsTyping(false);

      // 0. If currently held at a condition node (like Follower Gate), re-evaluate condition
      const currentCondition = currentNodeId
        ? nodes.find((n) => n.id === currentNodeId && n.data?.type === "ACTION_CONDITION")
        : undefined;
      if (currentCondition) {
        executeNode(currentCondition, newHistory);
        return;
      }

      let nextNode: Node | undefined = undefined;

      // 1. By targetNodeId on button
      if (btn.targetNodeId) {
        nextNode = nodes.find((n) => n.id === btn.targetNodeId);
      }

      // 2. By edge from currentNodeId
      if (!nextNode && currentNodeId) {
        const edge =
          edges.find((e) => e.source === currentNodeId && (!e.sourceHandle || e.sourceHandle === "default")) ||
          edges.find((e) => e.source === currentNodeId);
        if (edge) {
          nextNode = nodes.find((n) => n.id === edge.target);
        }
      }

      // 3. Next sequential ACTION node
      if (!nextNode) {
        const actionNodes = nodes.filter((n) =>
          (n.data?.type as string)?.startsWith("ACTION_")
        );
        const currentIdx = actionNodes.findIndex((n) => n.id === currentNodeId);
        if (currentIdx !== -1 && currentIdx + 1 < actionNodes.length) {
          nextNode = actionNodes[currentIdx + 1];
        }
      }

      if (nextNode) {
        executeNode(nextNode, newHistory);
      } else {
        // Fallback intelligent automated reply
        setMessages([
          ...newHistory,
          {
            id: `reply-${Date.now()}`,
            sender: "business",
            text: `Perfect! We have processed your choice for "${btn.title}". A team member will follow up with you shortly.`,
            timestamp: new Date(),
          },
        ]);
      }
    }, 650);
  };

  // Handle user typing custom message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    const text = customInput.trim();
    setCustomInput("");

    const userMsg: ChatMessage = {
      id: `custom-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);

      // Check if current node is a condition node (like Follower Gate) and re-evaluate
      const currentCondition = currentNodeId
        ? nodes.find((n) => n.id === currentNodeId && n.data?.type === "ACTION_CONDITION")
        : undefined;
      if (currentCondition) {
        executeNode(currentCondition, newHistory);
        return;
      }

      // Check if current node has a connected edge to the next step
      let nextNode: Node | undefined = undefined;
      if (currentNodeId) {
        const edge =
          edges.find((e) => e.source === currentNodeId && (!e.sourceHandle || e.sourceHandle === "default")) ||
          edges.find((e) => e.source === currentNodeId);
        if (edge) {
          nextNode = nodes.find((n) => n.id === edge.target);
        }
      }

      if (nextNode) {
        executeNode(nextNode, newHistory);
      } else {
        // Fallback simulated reply if at the end of the flow
        setMessages([
          ...newHistory,
          {
            id: `bot-reply-${Date.now()}`,
            sender: "business",
            text: `Thanks for messaging us! We received your message: "${text}". How else can we assist you today?`,
            timestamp: new Date(),
          },
        ]);
      }
    }, 600);
  };

  // Automatically trigger simulation when opened
  useEffect(() => {
    if (isOpen) {
      startSimulation();
    }
  }, [isOpen, nodes, edges]);

  return {
    messages,
    isTyping,
    currentNodeId,
    customInput,
    setCustomInput,
    simulatedIsFollowing,
    setSimulatedIsFollowing,
    messagesEndRef,
    scrollToBottom,
    startSimulation,
    handleButtonClick,
    handleSendMessage,
  };
}

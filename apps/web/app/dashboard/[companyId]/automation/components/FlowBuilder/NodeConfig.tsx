"use client";

import { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { motion } from "framer-motion";
import { logger } from "@/lib/logger";
import { X } from "lucide-react";
import {
  SendDmNodeConfig,
  ReplyDmNodeConfig,
  ReplyCommentNodeConfig,
  WaitFlowEndNodeConfig,
  ConditionNodeConfig,
  SetVariableNodeConfig,
  FlowRandomNodeConfig,
  FlowSplitNodeConfig,
  TriggerDmNodeConfig,
  TriggerCommentNodeConfig,
  TriggerStoryNodeConfig,
  TriggerFollowerNodeConfig,
} from "./node-config/nodes";

interface NodeConfigProps {
  node: Node;
  onUpdate: (config: any) => void;
  onClose: () => void;
  instagramAccountId?: string;
  automationId?: string;
}

export default function NodeConfig({
  node,
  onUpdate,
  onClose,
  instagramAccountId,
  automationId,
}: NodeConfigProps) {
  const [config, setConfig] = useState<any>(node.data.config || {});
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [showManualStoryInput, setShowManualStoryInput] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState<string>("");
  const [availableCompanyTags, setAvailableCompanyTags] = useState<string[]>([]);
  const [availableCompanyStatuses, setAvailableCompanyStatuses] = useState<string[]>([]);

  useEffect(() => {
    async function loadCompanyTags() {
      try {
        const res = await fetch("/api/crm/pipeline-config");
        if (res.ok) {
          const data = await res.json();
          const list = data.customTags || data.config?.customTags;
          if (Array.isArray(list) && list.length > 0) {
            setAvailableCompanyTags(list);
          }
          const statuses = data.customStatuses || data.config?.customStatuses;
          if (Array.isArray(statuses) && statuses.length > 0) {
            setAvailableCompanyStatuses(statuses);
          }
        }
      } catch (err) {
        logger.error("Failed to load company tags in NodeConfig:", err);
      }
    }
    loadCompanyTags();
  }, []);

  useEffect(() => {
    logger.log("[NodeConfig] Node changed, loading config:", node.id, node.data.config);
    let configData = node.data.config || {};

    // Migrate old button format (useButton/buttonTitle) to new buttons array format
    if ((configData as any).useButton && (configData as any).buttonTitle && !(configData as any).buttons) {
      configData = {
        ...configData,
        buttons: [{ type: 'reply', title: (configData as any).buttonTitle }],
        useButton: undefined,
        buttonTitle: undefined,
      };
      logger.log("[NodeConfig] Migrated old button format to new buttons array");
    }

    setConfig(configData);
    // Initialize keywords input from config
    const keywords = (configData as any).keywords || [];
    setKeywordsInput(Array.isArray(keywords) ? keywords.join(", ") : "");
  }, [node.id, node.data.config]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    // Process keywords from input before saving (if applicable)
    const keywords = keywordsInput.split(",").map((k: string) => k.trim()).filter(Boolean);

    // Build updated config with ALL fields from current config
    // Only update keywords/matchType if this node uses keywords
    const nodeType = typeof node.data.type === 'string' ? node.data.type : '';
    const updatedConfig = {
      ...config, // Include all existing config fields (message, duration, condition, selectedMediaId, etc.)
      // Only update keywords-related fields if this is a trigger node that uses keywords
      ...(nodeType.startsWith("TRIGGER_") && (nodeType === "TRIGGER_COMMENT" || nodeType === "TRIGGER_DM" || nodeType === "TRIGGER_STORY") ? {
        keywords,
        matchType: config.fuzzyMatch ? "FUZZY" : (config.matchType || "CONTAINS"),
      } : {}),
    };

    // Save to database immediately via onUpdate
    await onUpdate(updatedConfig);

    // If this is a trigger node, immediately sync config to Automation table
    // This ensures webhooks can find matching automations
    if (nodeType.startsWith("TRIGGER_") && automationId) {
      try {
        const automationUpdate: any = {};

        if (nodeType === "TRIGGER_COMMENT") {
          automationUpdate.triggerKeywords = keywords;
          automationUpdate.triggerMatchType = updatedConfig.fuzzyMatch ? "FUZZY" : (updatedConfig.matchType || "CONTAINS");

          if (updatedConfig.selectedMediaId) {
            automationUpdate.mediaId = updatedConfig.selectedMediaId;
            automationUpdate.mediaType = updatedConfig.selectedMediaType || null;
          }

          // Set triggerType based on selectedMediaType (REEL -> COMMENT_REEL, otherwise COMMENT_POST)
          const selectedMediaType = updatedConfig.selectedMediaType || '';
          automationUpdate.triggerType = (selectedMediaType === 'REEL' || selectedMediaType === 'REELS') ? 'COMMENT_REEL' : 'COMMENT_POST';

          logger.log(`[NodeConfig] Setting triggerType to ${automationUpdate.triggerType} based on selectedMediaType: ${selectedMediaType}`);
        } else if (nodeType === "TRIGGER_DM") {
          automationUpdate.triggerKeywords = keywords;
          automationUpdate.triggerMatchType = updatedConfig.fuzzyMatch ? "FUZZY" : (updatedConfig.matchType || "CONTAINS");
          automationUpdate.triggerType = 'DM_RECEIVED';
        } else if (nodeType === "TRIGGER_STORY") {
          automationUpdate.triggerKeywords = keywords;
          automationUpdate.triggerMatchType = updatedConfig.fuzzyMatch ? "FUZZY" : (updatedConfig.matchType || "CONTAINS");
          // TRIGGER_STORY could be STORY_MENTION or STORY_REPLY (including reaction)
          const storyType = String(updatedConfig.storyType || '').toLowerCase();
          const isReplyOrReaction = storyType === 'reply' || storyType === 'reaction';
          automationUpdate.triggerType = isReplyOrReaction ? 'STORY_REPLY' : 'STORY_MENTION';

          // Sync story ID if selected
          if (updatedConfig.selectedMediaId) {
            automationUpdate.mediaId = updatedConfig.selectedMediaId;
            automationUpdate.mediaType = updatedConfig.selectedMediaType || "STORY";
          } else {
            automationUpdate.mediaId = null;
            automationUpdate.mediaType = null;
          }
        } else if (nodeType === "TRIGGER_FOLLOWER") {
          automationUpdate.triggerType = 'NEW_FOLLOWER';
        }

        if (Object.keys(automationUpdate).length > 0) {
          logger.log(`[NodeConfig] Syncing trigger config to Automation table immediately:`, automationUpdate);
          await fetch(`/api/automations/${automationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(automationUpdate),
          });
        }
      } catch (error) {
        logger.error("[NodeConfig] Failed to sync trigger config:", error);
      }
    }
  };

  const renderConfigFields = () => {
    switch (node.data.type) {
      case "ACTION_SEND_DM":
        return <SendDmNodeConfig config={config} setConfig={setConfig} />;

      case "ACTION_REPLY_DM":
        return <ReplyDmNodeConfig config={config} setConfig={setConfig} />;

      case "ACTION_REPLY_COMMENT":
        return <ReplyCommentNodeConfig config={config} setConfig={setConfig} />;

      case "ACTION_WAIT":
      case "ACTION_WAIT_FOR_REPLY":
      case "FLOW_END":
        return <WaitFlowEndNodeConfig config={config} setConfig={setConfig} />;

      case "ACTION_CONDITION":
        return (
          <ConditionNodeConfig
            node={node}
            config={config}
            setConfig={setConfig}
            availableCompanyTags={availableCompanyTags}
            availableCompanyStatuses={availableCompanyStatuses}
          />
        );

      case "ACTION_SET_VARIABLE":
        return (
          <SetVariableNodeConfig
            config={config}
            setConfig={setConfig}
            availableCompanyTags={availableCompanyTags}
            availableCompanyStatuses={availableCompanyStatuses}
          />
        );

      case "FLOW_RANDOM":
        return <FlowRandomNodeConfig config={config} setConfig={setConfig} />;

      case "FLOW_SPLIT":
        return <FlowSplitNodeConfig config={config} setConfig={setConfig} />;

      case "TRIGGER_DM":
        return (
          <TriggerDmNodeConfig
            config={config}
            setConfig={setConfig}
            keywordsInput={keywordsInput}
            setKeywordsInput={setKeywordsInput}
          />
        );

      case "TRIGGER_COMMENT":
        return (
          <TriggerCommentNodeConfig
            config={config}
            setConfig={setConfig}
            keywordsInput={keywordsInput}
            setKeywordsInput={setKeywordsInput}
            showMediaSelector={showMediaSelector}
            setShowMediaSelector={setShowMediaSelector}
            instagramAccountId={instagramAccountId}
            automationId={automationId}
          />
        );

      case "TRIGGER_STORY":
        return (
          <TriggerStoryNodeConfig
            config={config}
            setConfig={setConfig}
            keywordsInput={keywordsInput}
            setKeywordsInput={setKeywordsInput}
            showMediaSelector={showMediaSelector}
            setShowMediaSelector={setShowMediaSelector}
            showManualStoryInput={showManualStoryInput}
            setShowManualStoryInput={setShowManualStoryInput}
            instagramAccountId={instagramAccountId}
            automationId={automationId}
          />
        );

      case "TRIGGER_FOLLOWER":
        return <TriggerFollowerNodeConfig />;

      default:
        return (
          <div className="text-sm text-slate-500">
            No configuration needed for this node type.
          </div>
        );
    }
  };

  return (
    <>
      {/* Backdrop: translucent dark overlay over canvas, click to dismiss */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs cursor-pointer"
        aria-label="Close configuration overlay"
      />

      {/* Slide-over Drawer: increased width to 480px, smooth spring slide */}
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white border-l border-slate-200 shadow-2xl overflow-y-auto flex flex-col justify-between"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 text-lg">Configuration</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-sm font-semibold text-slate-900 mb-1">
              {String(node.data.label)}
            </div>
            <div className="text-xs text-slate-500 font-mono bg-white px-2 py-1 rounded inline-block border border-slate-200">
              {String(node.data.type)}
            </div>
          </div>

          <div className="space-y-6">{renderConfigFields()}</div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSave}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

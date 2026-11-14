"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FolderTree from "./FolderTree";
import AutomationList from "./AutomationList";
import AutomationTemplates from "./AutomationTemplates";
import PromptModal from "./PromptModal";
import { type AutomationTemplate } from "@/lib/automation/templates";
import { logger } from "@/lib/logger";
import { toast } from "@/lib/toast";

interface Folder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  _count?: {
    automations: number;
  };
}

interface Automation {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: string;
  _count?: {
    executions: number;
  };
}

interface AutomationDashboardProps {
  instagramAccountId: string;
  basePath: string;
}

export default function AutomationDashboard({
  instagramAccountId,
  basePath,
}: AutomationDashboardProps) {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [promptType, setPromptType] = useState<"folder" | "automation" | null>(null);

  useEffect(() => {
    loadFolders();
  }, [instagramAccountId]);

  useEffect(() => {
    if (selectedFolderId) {
      loadAutomations(selectedFolderId);
    } else {
      setAutomations([]);
    }
  }, [selectedFolderId]);

  const loadFolders = async () => {
    try {
      const response = await fetch(
        `/api/automations/folders?instagramAccountId=${instagramAccountId}`
      );
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
        if (data.folders && data.folders.length > 0 && !selectedFolderId) {
          setSelectedFolderId(data.folders[0].id);
        }
      }
    } catch (error) {
      logger.error("Failed to load folders:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAutomations = async (folderId: string) => {
    try {
      const response = await fetch(`/api/automations?folderId=${folderId}`);
      if (response.ok) {
        const data = await response.json();
        setAutomations(data.automations || []);
      }
    } catch (error) {
      logger.error("Failed to load automations:", error);
    }
  };

  const handleCreateFolder = () => {
    setPromptType("folder");
  };

  const handleConfirmFolder = async (name: string) => {
    setPromptType(null);
    try {
      const response = await fetch("/api/automations/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramAccountId,
          name,
        }),
      });

      if (response.ok) {
        toast.success("Folder created", `Folder "${name}" was created successfully.`);
        loadFolders();
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error("Failed to create folder", err.error || err.message || "An unexpected error occurred.");
      }
    } catch (error: any) {
      logger.error("Create folder error:", error);
      toast.error("Failed to create folder", error?.message || "Please check your network and try again.");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const response = await fetch(`/api/automations/folders/${folderId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Folder deleted");
        const remainingFolders = folders.filter((f) => f.id !== folderId);
        setFolders(remainingFolders);
        if (selectedFolderId === folderId) {
          if (remainingFolders.length > 0) {
            setSelectedFolderId(remainingFolders[0].id);
          } else {
            setSelectedFolderId(null);
            setAutomations([]);
          }
        }
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error("Failed to delete folder", err.error || err.message || "An unexpected error occurred.");
      }
    } catch (error: any) {
      logger.error("Delete folder error:", error);
      toast.error("Failed to delete folder", error?.message || "Please try again.");
    }
  };

  const handleDeleteAutomation = async (automationId: string) => {
    try {
      const response = await fetch(`/api/automations/${automationId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Automation deleted");
        setAutomations((prev) => prev.filter((a) => a.id !== automationId));
        setFolders((prev) =>
          prev.map((f) =>
            f.id === selectedFolderId
              ? {
                ...f,
                _count: {
                  automations: Math.max(0, (f._count?.automations || 1) - 1),
                },
              }
              : f
          )
        );
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error("Failed to delete automation", err.error || err.message || "An unexpected error occurred.");
      }
    } catch (error: any) {
      logger.error("Delete automation error:", error);
      toast.error("Failed to delete automation", error?.message || "Please try again.");
    }
  };

  const handleDuplicateAutomation = async (automationId: string) => {
    try {
      const response = await fetch(`/api/automations/${automationId}/duplicate`, {
        method: "POST",
      });
      if (response.ok) {
        toast.success("Automation duplicated");
        if (selectedFolderId) {
          loadAutomations(selectedFolderId);
        }
        loadFolders();
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error("Failed to duplicate automation", err.error || err.message || "An unexpected error occurred.");
      }
    } catch (error: any) {
      logger.error("Duplicate automation error:", error);
      toast.error("Failed to duplicate automation", error?.message || "Please try again.");
    }
  };

  const handleCreateAutomation = () => {
    if (!selectedFolderId) {
      toast.warning("Folder required", "Please select or create a folder first before creating an automation.");
      return;
    }
    setShowTemplates(true);
  };

  const handleSelectTemplate = async (template: AutomationTemplate) => {
    if (!selectedFolderId) return;

    try {
      const response = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: selectedFolderId,
          name: template.title,
          description: template.description,
          triggerType: template.triggerType,
          triggerKeywords: template.triggerKeywords || [],
          triggerMatchType: template.triggerMatchType || null,
          nodes: template.nodes, // Include pre-configured nodes
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Automation created", `Created "${template.title}" from template.`);
        router.push(`${basePath}/automation/${data.automation.id}`);
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error("Failed to create automation", error.error || error.message || "An unexpected error occurred.");
      }
    } catch (error: any) {
      logger.error("Create automation error:", error);
      toast.error("Failed to create automation", error?.message || "Please try again.");
    }
  };

  const handleStartFromScratch = () => {
    if (!selectedFolderId) {
      toast.warning("Folder required", "Please select or create a folder first before creating an automation.");
      return;
    }
    setPromptType("automation");
  };

  const handleConfirmAutomation = async (name: string) => {
    setPromptType(null);
    setShowTemplates(false);
    if (!selectedFolderId) return;

    try {
      const response = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: selectedFolderId,
          name,
          triggerType: "DM_RECEIVED",
          description: null,
          triggerKeywords: [],
          triggerMatchType: null,
          nodes: [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Automation created", `Created "${name}".`);
        router.push(`${basePath}/automation/${data.automation.id}`);
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error("Failed to create automation", error.error || error.message || "An unexpected error occurred.");
      }
    } catch (error: any) {
      logger.error("Create automation error:", error);
      toast.error("Failed to create automation", error?.message || "Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-stone-800 text-lg font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0">
        <FolderTree
          folders={folders}
          selectedFolderId={selectedFolderId || undefined}
          onSelectFolder={setSelectedFolderId}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
        />
        <AutomationList
          automations={automations}
          folderId={selectedFolderId || ""}
          basePath={basePath}
          onCreateAutomation={handleCreateAutomation}
          onDeleteAutomation={handleDeleteAutomation}
          onDuplicateAutomation={handleDuplicateAutomation}
        />
      </div>
      <AutomationTemplates
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={handleSelectTemplate}
        onStartFromScratch={handleStartFromScratch}
      />


      <PromptModal
        isOpen={promptType === "folder"}
        title="New folder"
        label="Enter folder name:"
        placeholder="e.g. Marketing, Sales"
        onConfirm={handleConfirmFolder}
        onCancel={() => setPromptType(null)}
      />

      <PromptModal
        isOpen={promptType === "automation"}
        title="New automation"
        label="Enter automation name:"
        placeholder="e.g. Welcome DM, Comment Reply"
        onConfirm={handleConfirmAutomation}
        onCancel={() => setPromptType(null)}
      />
    </>
  );
}

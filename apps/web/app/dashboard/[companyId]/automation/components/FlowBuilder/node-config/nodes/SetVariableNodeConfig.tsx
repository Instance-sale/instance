"use client";

import { Check } from "lucide-react";

interface SetVariableNodeConfigProps {
  config: Record<string, any>;
  setConfig: (config: any) => void;
  availableCompanyTags: string[];
  availableCompanyStatuses?: string[];
}

export function SetVariableNodeConfig({
  config,
  setConfig,
  availableCompanyTags = [],
  availableCompanyStatuses = [],
}: SetVariableNodeConfigProps) {
  const currentSelectedTags: string[] = Array.isArray(config.tags)
    ? config.tags
    : (config.addTag ? [config.addTag] : []);

  const currentSelectedStage: string =
    typeof config.pipelineStage === "string"
      ? config.pipelineStage
      : (typeof config.status === "string"
        ? config.status
        : (typeof config.stage === "string" ? config.stage : ""));

  const toggleTagSelection = (tag: string) => {
    let updated: string[];
    if (currentSelectedTags.includes(tag)) {
      updated = currentSelectedTags.filter((t) => t !== tag);
    } else {
      updated = [...currentSelectedTags, tag];
    }
    setConfig({
      ...config,
      tags: updated,
      addTag: updated[0] || "",
    });
  };

  const handleStageSelect = (stage: string) => {
    if (currentSelectedStage.toLowerCase() === stage.toLowerCase()) {
      setConfig({
        ...config,
        pipelineStage: "",
        status: "",
        stage: "",
      });
    } else {
      setConfig({
        ...config,
        pipelineStage: stage,
        status: stage,
        stage: stage,
      });
    }
  };

  const stagesToDisplay =
    availableCompanyStatuses.length > 0
      ? availableCompanyStatuses
      : ["New", "Engaged", "Qualified", "Follow-up Due"];

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
        <p className="text-xs font-semibold text-blue-800 mb-1">
          Set Variable, Tags & Pipeline Stage
        </p>
        <p className="text-xs text-blue-700">
          Store user attributes for conditions, attach CRM tags, or move the lead into a specific pipeline stage.
        </p>
      </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Variable Name (optional)
              </label>
              <input
                type="text"
                value={config.variableName || ""}
                onChange={(e) =>
                  setConfig({ ...config, variableName: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer"
                placeholder="e.g., lead_status, quiz_score, budget, industry"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {["lead_status", "quiz_score", "budget", "user_email", "tier"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setConfig({ ...config, variableName: v })}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded cursor-pointer"
                  >
                    +{v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Assign Value
              </label>
              <input
                type="text"
                value={config.value || ""}
                onChange={(e) =>
                  setConfig({ ...config, value: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer"
                placeholder="e.g., Qualified or {{messageText}}"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {[
                  { label: "User Message", val: "{{messageText}}" },
                  { label: "Username", val: "{{username}}" },
                  { label: "Comment", val: "{{commentText}}" },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setConfig({ ...config, value: item.val })}
                    className="text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded cursor-pointer"
                  >
                    +{item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Apply Tags from Settings
              </label>
              <p className="text-xs text-slate-500">
                Select tags configured in Settings &gt; Pipeline to automatically attach to this user in the CRM:
              </p>

              {availableCompanyTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                  {availableCompanyTags.map((tag) => {
                    const isSelected = currentSelectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTagSelection(tag)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                      >
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>{tag}</span>
                          </span>
                        ) : (
                          `+ ${tag}`
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  No company tags defined yet. You can set up custom tags in <strong>Settings &gt; Pipeline</strong>, or enter custom tags below.
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mt-2 mb-1">
                  Or enter custom tag manually:
                </label>
                <input
                  type="text"
                  value={config.addTag || ""}
                  onChange={(e) =>
                    setConfig({ ...config, addTag: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer"
                  placeholder="e.g., vip_customer"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">
                  Update Pipeline / Funnel Stage
                </label>
                {currentSelectedStage && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        pipelineStage: "",
                        status: "",
                        stage: "",
                      })
                    }
                    className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                  >
                    Clear stage
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Move the lead into a CRM funnel stage (a lead can belong to one stage at a time):
              </p>

              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                {stagesToDisplay.map((stage) => {
                  const isSelected =
                    currentSelectedStage.toLowerCase() === stage.toLowerCase();
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => handleStageSelect(stage)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>{stage}</span>
                        </span>
                      ) : (
                        `→ ${stage}`
                      )}
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mt-2 mb-1">
                  Or enter custom stage manually:
                </label>
                <input
                  type="text"
                  value={currentSelectedStage}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      pipelineStage: e.target.value,
                      status: e.target.value,
                      stage: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer"
                  placeholder="e.g., Qualified, Closed Won, Follow-up Due"
                />
              </div>
            </div>
          </div>
        );
}

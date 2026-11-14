"use client";

import React, { useMemo } from "react";
import { Plus, Trash2, Check, Sparkles, X } from "lucide-react";

export interface ConditionRule {
  id: string;
  fieldType: "tag" | "pipeline" | "follower" | "variable" | "number" | "boolean";
  operator: string;
  variable?: string;
  tag?: string;
  tags?: string[];
  status?: string;
  value?: string;
}

export interface ConditionGroup {
  id: string;
  logic: "AND" | "OR";
  rules: ConditionRule[];
}

interface ConditionConfigEditorProps {
  config: Record<string, any>;
  setConfig: (next: Record<string, any>) => void;
  availableCompanyTags: string[];
  availableCompanyStatuses: string[];
}

export function ConditionConfigEditor({
  config,
  setConfig,
  availableCompanyTags,
  availableCompanyStatuses,
}: ConditionConfigEditorProps) {
  // Migrate single legacy condition into conditionGroups if not yet initialized
  const groups: ConditionGroup[] = useMemo(() => {
    if (Array.isArray(config.conditionGroups) && config.conditionGroups.length > 0) {
      return config.conditionGroups;
    }
    const legacy = config.condition || {};
    const legacyField = legacy.fieldType || "variable";
    const initialRule: ConditionRule = {
      id: "rule-1",
      fieldType: legacyField,
      operator:
        legacy.operator ||
        (legacyField === "follower"
          ? "is_following"
          : legacyField === "tag"
          ? "has"
          : legacyField === "pipeline"
          ? "is"
          : "equals"),
      variable: legacy.variable || "",
      tag: legacy.tag || (availableCompanyTags[0] || ""),
      tags: Array.isArray(legacy.tags)
        ? legacy.tags
        : legacy.tag
        ? [legacy.tag]
        : availableCompanyTags[0]
        ? [availableCompanyTags[0]]
        : [],
      status: legacy.status || (availableCompanyStatuses[0] || ""),
      value: legacy.value || "",
    };
    return [
      {
        id: "group-1",
        logic: "AND",
        rules: [initialRule],
      },
    ];
  }, [config.conditionGroups, config.condition, availableCompanyTags, availableCompanyStatuses]);

  const updateGroups = (nextGroups: ConditionGroup[]) => {
    const firstRule = nextGroups[0]?.rules[0] || {};
    setConfig({
      ...config,
      conditionGroups: nextGroups,
      groupLogic: "OR",
      // Keep legacy condition in sync for backward compatibility
      condition: {
        fieldType: firstRule.fieldType || "variable",
        operator: firstRule.operator || "equals",
        variable: firstRule.variable || "",
        tag: firstRule.tag || "",
        tags: firstRule.tags || [],
        status: firstRule.status || "",
        value: firstRule.value || "",
      },
    });
  };

  const addRuleToGroup = (groupId: string) => {
    const next = groups.map((g) => {
      if (g.id !== groupId) return g;
      const newRule: ConditionRule = {
        id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fieldType: "tag",
        operator: "has",
        tag: availableCompanyTags[0] || "",
        tags: availableCompanyTags[0] ? [availableCompanyTags[0]] : [],
        variable: "",
        status: availableCompanyStatuses[0] || "",
        value: "",
      };
      return { ...g, rules: [...g.rules, newRule] };
    });
    updateGroups(next);
  };

  const removeRule = (groupId: string, ruleId: string) => {
    const next = groups
      .map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, rules: g.rules.filter((r) => r.id !== ruleId) };
      })
      .filter((g) => g.rules.length > 0);

    if (next.length === 0) {
      updateGroups([
        {
          id: `group-${Date.now()}`,
          logic: "AND",
          rules: [
            {
              id: `rule-${Date.now()}`,
              fieldType: "tag",
              operator: "has",
              tag: availableCompanyTags[0] || "",
              tags: availableCompanyTags[0] ? [availableCompanyTags[0]] : [],
            },
          ],
        },
      ]);
    } else {
      updateGroups(next);
    }
  };

  const updateRule = (groupId: string, ruleId: string, updates: Partial<ConditionRule>) => {
    const next = groups.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        rules: g.rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)),
      };
    });
    updateGroups(next);
  };

  const addGroup = () => {
    const newGroup: ConditionGroup = {
      id: `group-${Date.now()}`,
      logic: "AND",
      rules: [
        {
          id: `rule-${Date.now()}`,
          fieldType: "pipeline",
          operator: "is",
          status: availableCompanyStatuses[0] || "Qualified",
        },
      ],
    };
    updateGroups([...groups, newGroup]);
  };

  const removeGroup = (groupId: string) => {
    if (groups.length <= 1) return;
    updateGroups(groups.filter((g) => g.id !== groupId));
  };

  const toggleGroupLogic = (groupId: string) => {
    const next = groups.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        logic: g.logic === "AND" ? ("OR" as const) : ("AND" as const),
      };
    });
    updateGroups(next);
  };

  // Helper to describe rules for plain-English live summary
  const describeRule = (rule: ConditionRule): string => {
    switch (rule.fieldType) {
      case "tag": {
        if (rule.operator === "not_has") return `Does NOT have tag "${rule.tag || "..."}"`;
        if (rule.operator === "has_any") {
          const list = rule.tags && rule.tags.length > 0 ? rule.tags.join(", ") : rule.tag || "...";
          return `Has ANY tag in [${list}]`;
        }
        if (rule.operator === "has_all") {
          const list = rule.tags && rule.tags.length > 0 ? rule.tags.join(", ") : rule.tag || "...";
          return `Has ALL tags in [${list}]`;
        }
        return `Has tag "${rule.tag || "..."}"`;
      }
      case "pipeline": {
        if (rule.operator === "is_not") return `Pipeline stage is NOT "${rule.status || "..."}"`;
        return `Pipeline stage is "${rule.status || "..."}"`;
      }
      case "follower": {
        if (rule.operator === "not_following") return "Is NOT following account";
        return "Is following account";
      }
      case "number": {
        const opMap: Record<string, string> = {
          equals: "=",
          not_equals: "≠",
          greater_than: ">",
          less_than: "<",
          greater_equal: "≥",
          less_equal: "≤",
        };
        const sym = opMap[rule.operator] || "=";
        return `${rule.variable || "number"} ${sym} ${rule.value || "0"}`;
      }
      case "boolean": {
        return `${rule.variable || "variable"} is ${rule.operator === "equals" ? "True" : "False"}`;
      }
      case "variable":
      default: {
        if (rule.operator === "is_set") return `${rule.variable || "variable"} is provided`;
        if (rule.operator === "is_not_set") return `${rule.variable || "variable"} is empty`;
        return `${rule.variable || "messageText"} ${rule.operator || "equals"} "${rule.value || ""}"`;
      }
    }
  };

  const plainEnglishSummary = useMemo(() => {
    if (!groups.length) return "Always routes to True path.";
    const groupTexts = groups.map((g) => {
      const ruleTexts = g.rules.map(describeRule);
      if (ruleTexts.length === 1) return ruleTexts[0];
      return `(${ruleTexts.join(` ${g.logic || "AND"} `)})`;
    });
    return groupTexts.join(" OR ");
  }, [groups]);

  const totalRulesCount = useMemo(() => {
    return groups.reduce((acc, g) => acc + g.rules.length, 0);
  }, [groups]);

  // Check if follower gate prompt message should be enabled
  const hasFollowerCheckOnly =
    groups.length === 1 &&
    groups[0].rules.length === 1 &&
    groups[0].rules[0].fieldType === "follower";

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200/80 rounded-xl space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              Condition &amp; Branching Engine
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
            {totalRulesCount} rule{totalRulesCount === 1 ? "" : "s"} across {groups.length} group{groups.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Evaluate contact tags, pipeline stages, follower status, and custom fields. If the criteria pass, execution takes the <strong className="text-emerald-700">True</strong> path. Otherwise, it takes the <strong className="text-red-700">False</strong> path.
        </p>
      </div>

      {/* Condition Groups List */}
      <div className="space-y-4">
        {groups.map((group, groupIdx) => {
          return (
            <div key={group.id} className="space-y-3">
              {groupIdx > 0 && (
                <div className="relative flex items-center justify-center my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-purple-200"></div>
                  </div>
                  <div className="relative flex items-center gap-1.5 px-3 py-1 bg-purple-100 border border-purple-300 rounded-full text-[11px] font-extrabold text-purple-900 shadow-sm">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span>OR (Alternative Condition Group)</span>
                  </div>
                </div>
              )}

              {/* Group Card */}
              <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 font-mono text-xs font-bold flex items-center justify-center">
                      {groupIdx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Condition Group {groupIdx + 1}
                    </span>
                    {group.rules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => toggleGroupLogic(group.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                          group.logic === "AND"
                            ? "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200"
                            : "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200"
                        }`}
                        title="Click to toggle between AND (all rules must pass) and OR (any rule can pass)"
                      >
                        Match {group.logic === "AND" ? "ALL (AND)" : "ANY (OR)"}
                      </button>
                    )}
                  </div>

                  {groups.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGroup(group.id)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Group</span>
                    </button>
                  )}
                </div>

                {/* Rules Inside Group */}
                <div className="space-y-3">
                  {group.rules.map((rule, ruleIdx) => {
                    return (
                      <div key={rule.id} className="space-y-2">
                        {ruleIdx > 0 && (
                          <div className="flex items-center justify-center my-1.5">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                              {group.logic || "AND"}
                            </span>
                          </div>
                        )}

                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500">
                              Rule {ruleIdx + 1}
                            </span>
                            {group.rules.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeRule(group.id, rule.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                title="Remove rule"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Field Type Selector */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Check Category
                              </label>
                              <select
                                value={rule.fieldType}
                                onChange={(e) => {
                                  const ft = e.target.value as ConditionRule["fieldType"];
                                  updateRule(group.id, rule.id, {
                                    fieldType: ft,
                                    operator:
                                      ft === "tag"
                                        ? "has"
                                        : ft === "pipeline"
                                        ? "is"
                                        : ft === "follower"
                                        ? "is_following"
                                        : "equals",
                                    variable:
                                      ft === "tag" || ft === "follower" || ft === "pipeline"
                                        ? ""
                                        : rule.variable || "messageText",
                                    tag: availableCompanyTags[0] || "",
                                    tags: availableCompanyTags[0] ? [availableCompanyTags[0]] : [],
                                    status: availableCompanyStatuses[0] || "Qualified",
                                  });
                                }}
                                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              >
                                <option value="tag">CRM Tag</option>
                                <option value="pipeline">Pipeline Stage</option>
                                <option value="follower">Instagram Follower Status</option>
                                <option value="variable">Message Text / Variable</option>
                                <option value="number">Numeric Comparison</option>
                                <option value="boolean">Boolean True/False</option>
                              </select>
                            </div>

                            {/* Operator Selector */}
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Operator
                              </label>
                              <select
                                value={rule.operator}
                                onChange={(e) =>
                                  updateRule(group.id, rule.id, { operator: e.target.value })
                                }
                                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              >
                                {rule.fieldType === "tag" ? (
                                  <>
                                    <option value="has">Has Tag</option>
                                    <option value="not_has">Does NOT Have Tag</option>
                                    <option value="has_any">Has ANY of Selected Tags</option>
                                    <option value="has_all">Has ALL Selected Tags</option>
                                  </>
                                ) : rule.fieldType === "pipeline" ? (
                                  <>
                                    <option value="is">Is in Stage</option>
                                    <option value="is_not">Is NOT in Stage</option>
                                  </>
                                ) : rule.fieldType === "follower" ? (
                                  <>
                                    <option value="is_following">Is Following Account</option>
                                    <option value="not_following">Is NOT Following</option>
                                  </>
                                ) : rule.fieldType === "number" ? (
                                  <>
                                    <option value="equals">Equals (=)</option>
                                    <option value="not_equals">Not Equals (≠)</option>
                                    <option value="greater_than">Greater Than (&gt;)</option>
                                    <option value="less_than">Less Than (&lt;)</option>
                                    <option value="greater_equal">Greater or Equal (≥)</option>
                                    <option value="less_equal">Less or Equal (≤)</option>
                                  </>
                                ) : rule.fieldType === "boolean" ? (
                                  <>
                                    <option value="equals">Is True</option>
                                    <option value="not_equals">Is False</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="equals">Equals</option>
                                    <option value="not_equals">Not Equals</option>
                                    <option value="contains">Contains Text</option>
                                    <option value="not_contains">Does Not Contain</option>
                                    <option value="startsWith">Starts With</option>
                                    <option value="endsWith">Ends With</option>
                                    <option value="is_set">Is Set / Exists</option>
                                    <option value="is_not_set">Is Empty / Not Set</option>
                                  </>
                                )}
                              </select>
                            </div>
                          </div>

                          {/* Dynamic Controls based on Category */}

                          {/* 1. TAG Controls */}
                          {rule.fieldType === "tag" && (
                            <div className="space-y-2 pt-1">
                              <label className="block text-xs font-semibold text-slate-700">
                                {rule.operator === "has_any" || rule.operator === "has_all"
                                  ? "Select Target Tags (Click to toggle)"
                                  : "Select Tag"}
                              </label>

                              {availableCompanyTags.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-36 overflow-y-auto">
                                  {availableCompanyTags.map((t) => {
                                    const isSelected =
                                      rule.operator === "has_any" || rule.operator === "has_all"
                                        ? Array.isArray(rule.tags) && rule.tags.includes(t)
                                        : rule.tag === t;

                                    return (
                                      <button
                                        key={t}
                                        type="button"
                                        onClick={() => {
                                          if (
                                            rule.operator === "has_any" ||
                                            rule.operator === "has_all"
                                          ) {
                                            const currentTags = Array.isArray(rule.tags)
                                              ? rule.tags
                                              : [];
                                            const updated = currentTags.includes(t)
                                              ? currentTags.filter((x) => x !== t)
                                              : [...currentTags, t];
                                            updateRule(group.id, rule.id, {
                                              tags: updated,
                                              tag: updated[0] || "",
                                            });
                                          } else {
                                            updateRule(group.id, rule.id, {
                                              tag: t,
                                              tags: [t],
                                            });
                                          }
                                        }}
                                        className={`px-2 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                                          isSelected
                                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                        }`}
                                      >
                                        <span className="flex items-center gap-1">
                                          {isSelected && <Check className="w-3 h-3" />}
                                          <span>{t}</span>
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-amber-700">
                                  No tags configured in Settings. Manage tags in Dashboard &gt; Settings &gt; Pipeline.
                                </p>
                              )}

                              <input
                                type="text"
                                value={rule.tag || ""}
                                onChange={(e) =>
                                  updateRule(group.id, rule.id, {
                                    tag: e.target.value,
                                    tags: [e.target.value],
                                  })
                                }
                                placeholder="Or enter custom tag name manually..."
                                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 placeholder:text-slate-400"
                              />
                            </div>
                          )}

                          {/* 2. PIPELINE Controls */}
                          {rule.fieldType === "pipeline" && (
                            <div className="space-y-2 pt-1">
                              <label className="block text-xs font-semibold text-slate-700">
                                Pipeline Stage
                              </label>

                              {availableCompanyStatuses.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                                  {availableCompanyStatuses.map((st) => {
                                    const isSelected = (rule.status || "").toLowerCase() === st.toLowerCase();
                                    return (
                                      <button
                                        key={st}
                                        type="button"
                                        onClick={() =>
                                          updateRule(group.id, rule.id, { status: st })
                                        }
                                        className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                                          isSelected
                                            ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                        }`}
                                      >
                                        <span className="flex items-center gap-1">
                                          {isSelected && <Check className="w-3 h-3" />}
                                          <span>{st}</span>
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <select
                                  value={rule.status || "Qualified"}
                                  onChange={(e) =>
                                    updateRule(group.id, rule.id, { status: e.target.value })
                                  }
                                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                >
                                  <option value="New">New</option>
                                  <option value="Engaged">Engaged</option>
                                  <option value="Qualified">Qualified</option>
                                  <option value="Follow-up Due">Follow-up Due</option>
                                </select>
                              )}
                              <p className="text-[11px] text-slate-500">
                                Check the contact's live stage on your CRM Kanban board (configured in Settings &gt; Pipeline).
                              </p>
                            </div>
                          )}

                          {/* 3. FOLLOWER Controls */}
                          {rule.fieldType === "follower" && (
                            <div className="space-y-3 pt-1">
                              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                                <span className="font-semibold flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  <span>Real-Time Instagram Follower Verification</span>
                                </span>
                                <p className="text-[11px] text-emerald-700 leading-relaxed">
                                  Verifies in real-time via Meta Graph API whether the lead is actively following your Instagram account.
                                </p>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Follower Condition
                                </label>
                                <select
                                  value={rule.operator || "is_following"}
                                  onChange={(e) => updateRule(group.id, rule.id, { operator: e.target.value })}
                                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                                >
                                  <option value="is_following">Is Following Account (Passes True)</option>
                                  <option value="not_following">Is NOT Following Account (Passes True)</option>
                                </select>
                              </div>

                              {/* Follower Gate Mode Toggle */}
                              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                <label className="flex items-start gap-2.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(config.isFollowerGate || config.message)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      const defaultPrompt = "Hey {name}! Please follow our Instagram account first to unlock this link. Once followed, tap the button below.";
                                      const defaultBtns = [
                                        { type: "reply", title: "I've Followed" },
                                        { type: "link", title: "Follow Us", url: "https://instagram.com" },
                                      ];
                                      setConfig({
                                        ...config,
                                        isFollowerGate: checked,
                                        message: checked ? config.message || defaultPrompt : undefined,
                                        buttons: checked ? (config.buttons?.length ? config.buttons : defaultBtns) : undefined,
                                      });
                                    }}
                                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <div className="text-xs">
                                    <span className="font-bold text-slate-800">
                                      Send DM Prompt if Not Following (Follower Gate Mode)
                                    </span>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      Pauses the flow and asks non-followers to follow your account before unlocking the rest of the automation.
                                    </p>
                                  </div>
                                </label>

                                {(config.isFollowerGate || config.message) && (
                                  <div className="pt-2 border-t border-slate-200 space-y-3">
                                    <div>
                                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Message to Non-Followers
                                      </label>
                                      <textarea
                                        rows={3}
                                        value={config.message || ""}
                                        onChange={(e) => setConfig({ ...config, message: e.target.value })}
                                        placeholder="Hey {name}! Please follow our Instagram account first to unlock this link. Once followed, tap the button below."
                                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
                                      />
                                      <p className="text-[11px] text-slate-400 mt-1">
                                        Available placeholders: <code className="bg-slate-100 px-1 rounded">{"{name}"}</code>, <code className="bg-slate-100 px-1 rounded">{"{username}"}</code>
                                      </p>
                                    </div>

                                    {/* Buttons Builder */}
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <label className="block text-xs font-semibold text-slate-700">
                                          Interactive Gate Buttons (Max 3)
                                        </label>
                                        <span className="text-[11px] text-slate-400">
                                          {(config.buttons || []).length}/3
                                        </span>
                                      </div>

                                      {(config.buttons || []).map((btn: any, bIdx: number) => (
                                        <div key={bIdx} className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-2 text-xs">
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium text-slate-700">Button #{bIdx + 1}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const nextBtns = (config.buttons || []).filter((_: any, i: number) => i !== bIdx);
                                                setConfig({ ...config, buttons: nextBtns });
                                              }}
                                              className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
                                            >
                                              Remove
                                            </button>
                                          </div>

                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const nextBtns = [...(config.buttons || [])];
                                                nextBtns[bIdx] = { ...nextBtns[bIdx], type: "reply", url: undefined };
                                                setConfig({ ...config, buttons: nextBtns });
                                              }}
                                              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                                                btn.type !== "link"
                                                  ? "bg-purple-100 text-purple-800 border-purple-300"
                                                  : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                              }`}
                                            >
                                              Reply Button (Re-check)
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const nextBtns = [...(config.buttons || [])];
                                                nextBtns[bIdx] = { ...nextBtns[bIdx], type: "link", url: nextBtns[bIdx].url || "https://instagram.com" };
                                                setConfig({ ...config, buttons: nextBtns });
                                              }}
                                              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                                                btn.type === "link"
                                                  ? "bg-purple-100 text-purple-800 border-purple-300"
                                                  : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                              }`}
                                            >
                                              Link Button (Profile URL)
                                            </button>
                                          </div>

                                          <div>
                                            <input
                                              type="text"
                                              value={btn.title || ""}
                                              onChange={(e) => {
                                                const nextBtns = [...(config.buttons || [])];
                                                nextBtns[bIdx] = { ...nextBtns[bIdx], title: e.target.value.substring(0, 20) };
                                                setConfig({ ...config, buttons: nextBtns });
                                              }}
                                              className="w-full rounded-md border border-slate-200 px-2.5 py-1 text-xs"
                                              placeholder="e.g. I've Followed"
                                              maxLength={20}
                                            />
                                          </div>

                                          {btn.type === "link" && (
                                            <input
                                              type="url"
                                              value={btn.url || ""}
                                              onChange={(e) => {
                                                const nextBtns = [...(config.buttons || [])];
                                                nextBtns[bIdx] = { ...nextBtns[bIdx], url: e.target.value };
                                                setConfig({ ...config, buttons: nextBtns });
                                              }}
                                              className="w-full rounded-md border border-slate-200 px-2.5 py-1 text-xs"
                                              placeholder="https://instagram.com/your_handle"
                                            />
                                          )}
                                        </div>
                                      ))}

                                      {(!config.buttons || config.buttons.length < 3) && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const defaultTitle = (!config.buttons || config.buttons.length === 0) ? "I've Followed" : "Follow Us";
                                            const defaultType = (!config.buttons || config.buttons.length === 0) ? "reply" : "link";
                                            const nextBtns = [
                                              ...(config.buttons || []),
                                              {
                                                type: defaultType,
                                                title: defaultTitle,
                                                url: defaultType === "link" ? "https://instagram.com" : undefined,
                                              },
                                            ];
                                            setConfig({ ...config, buttons: nextBtns });
                                          }}
                                          className="w-full py-1.5 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:border-purple-400 hover:text-purple-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-white"
                                        >
                                          + Add Verification / Link Button
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 4. VARIABLE / TEXT Controls */}
                          {rule.fieldType === "variable" && (
                            <div className="space-y-2 pt-1">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Variable or Profile Field
                                </label>
                                <div className="flex gap-1.5 mb-1.5 flex-wrap">
                                  {["messageText", "commentText", "email", "phone"].map((token) => (
                                    <button
                                      key={token}
                                      type="button"
                                      onClick={() =>
                                        updateRule(group.id, rule.id, { variable: token })
                                      }
                                      className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                                        rule.variable === token
                                          ? "bg-blue-100 text-blue-800 border-blue-300 font-bold"
                                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                      }`}
                                    >
                                      {token}
                                    </button>
                                  ))}
                                </div>
                                <input
                                  type="text"
                                  value={rule.variable || ""}
                                  onChange={(e) =>
                                    updateRule(group.id, rule.id, { variable: e.target.value })
                                  }
                                  placeholder="e.g. messageText, user_email, product_choice"
                                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                                />
                              </div>

                              {rule.operator !== "is_set" && rule.operator !== "is_not_set" && (
                                <div>
                                  <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Target Value to Compare
                                  </label>
                                  <input
                                    type="text"
                                    value={rule.value || ""}
                                    onChange={(e) =>
                                      updateRule(group.id, rule.id, { value: e.target.value })
                                    }
                                    placeholder="e.g. demo, pricing, VIP"
                                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {/* 5. NUMBER Controls */}
                          {rule.fieldType === "number" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Number Field
                                </label>
                                <input
                                  type="text"
                                  value={rule.variable || ""}
                                  onChange={(e) =>
                                    updateRule(group.id, rule.id, { variable: e.target.value })
                                  }
                                  placeholder="e.g. followersCount, quiz_score"
                                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Compare Value
                                </label>
                                <input
                                  type="number"
                                  value={rule.value || ""}
                                  onChange={(e) =>
                                    updateRule(group.id, rule.id, { value: e.target.value })
                                  }
                                  placeholder="e.g. 5000"
                                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                                />
                              </div>
                            </div>
                          )}

                          {/* 6. BOOLEAN Controls */}
                          {rule.fieldType === "boolean" && (
                            <div className="pt-1">
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Boolean Field
                              </label>
                              <input
                                type="text"
                                value={rule.variable || ""}
                                onChange={(e) =>
                                  updateRule(group.id, rule.id, { variable: e.target.value })
                                }
                                placeholder="e.g. isCustomer, hasPurchased"
                                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Rule Button inside Group */}
                <button
                  type="button"
                  onClick={() => addRuleToGroup(group.id)}
                  className="w-full py-1.5 border border-dashed border-blue-300 rounded-xl text-xs font-semibold text-blue-700 hover:bg-blue-50/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer bg-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rule (AND)</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Alternative Group (OR) Button */}
      <button
        type="button"
        onClick={addGroup}
        className="w-full py-2 border-2 border-dashed border-purple-300 rounded-2xl text-xs font-bold text-purple-700 hover:bg-purple-50/80 transition-all flex items-center justify-center gap-2 cursor-pointer bg-white shadow-xs"
      >
        <Plus className="w-4 h-4 text-purple-600" />
        <span>+ Add Alternative Group (OR)</span>
      </button>



      {/* Live Plain-English Translation Banner */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 text-blue-950 rounded-xl space-y-2 shadow-xs">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-700">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Live Logic Summary</span>
        </div>
        <p className="text-xs font-mono text-slate-700 leading-relaxed break-words">
          {plainEnglishSummary}
        </p>

        <div className="pt-2 border-t border-blue-200/60 grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>If True → Green Handle</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>If False → Red Handle</span>
          </div>
        </div>
      </div>
    </div>
  );
}

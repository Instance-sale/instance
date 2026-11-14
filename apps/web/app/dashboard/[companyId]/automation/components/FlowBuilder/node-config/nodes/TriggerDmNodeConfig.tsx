"use client";

import { FuzzyMatchSettings, AudienceFilterSelector } from "../index";

interface TriggerDmNodeConfigProps {
  config: Record<string, any>;
  setConfig: (config: any) => void;
  keywordsInput: string;
  setKeywordsInput: (val: string) => void;
}

export function TriggerDmNodeConfig({
  config,
  setConfig,
  keywordsInput,
  setKeywordsInput,
}: TriggerDmNodeConfigProps) {
  return (
    <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Trigger Type
              </label>
              <select
                value={config.triggerType || "any"}
                onChange={(e) =>
                  setConfig({ ...config, triggerType: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer font-medium"
              >
                <option value="any">Any Inbound DM</option>
                <option value="keyword">Keyword Match DM</option>
              </select>
            </div>
            {config.triggerType === "keyword" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Keywords (separate multiple with commas)
                </label>
                <textarea
                  value={keywordsInput}
                  onChange={(e) => {
                    setKeywordsInput(e.target.value);
                  }}
                  onBlur={(e) => {
                    const keywords = e.target.value.split(",").map((k: string) => k.trim()).filter(Boolean);
                    setConfig({
                      ...config,
                      keywords,
                      matchType: config.fuzzyMatch ? "FUZZY" : "CONTAINS",
                    });
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer"
                  rows={3}
                  placeholder="help, info, order, price, buy, interested"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Enter multiple keywords separated by commas. Automation triggers if the message contains <strong>any</strong> of these keywords.
                </p>
                {config.keywords && config.keywords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {config.keywords.map((keyword: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
                {/* Feature 1: Universal Fuzzy Keyword Matching */}
                <FuzzyMatchSettings
                  config={config}
                  setConfig={setConfig}
                  keywords={config.keywords || []}
                />
              </div>
            )}
            {/* Feature 2: Audience Eligibility Filter */}
            <AudienceFilterSelector config={config} setConfig={setConfig} />
          </div>
  );
}

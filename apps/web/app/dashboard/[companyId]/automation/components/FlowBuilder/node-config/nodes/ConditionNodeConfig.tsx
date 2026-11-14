"use client";

import { Node } from "@xyflow/react";
import { ConditionConfigEditor } from "../../ConditionConfigEditor";

interface ConditionNodeConfigProps {
  node: Node;
  config: Record<string, any>;
  setConfig: (config: any) => void;
  availableCompanyTags?: string[];
  availableCompanyStatuses?: string[];
}

export function ConditionNodeConfig({
  node,
  config,
  setConfig,
  availableCompanyTags = [],
  availableCompanyStatuses = [],
}: ConditionNodeConfigProps) {
  return (
    <ConditionConfigEditor
            config={config}
            setConfig={setConfig}
            availableCompanyTags={availableCompanyTags || []}
            availableCompanyStatuses={availableCompanyStatuses || []}
          />
  );
}

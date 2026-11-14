"use client";

interface WaitFlowEndNodeConfigProps {
  config: Record<string, any>;
  setConfig: (config: any) => void;
}

export function WaitFlowEndNodeConfig({ config, setConfig }: WaitFlowEndNodeConfigProps) {
  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              This node type is no longer available in the builder. Use per-action &quot;Wait before sending&quot; and
              &quot;Wait for their reply&quot; on Send DM / Reply DM instead. You can still view this node; replace it
              when editing the flow.
            </p>
          </div>
  );
}

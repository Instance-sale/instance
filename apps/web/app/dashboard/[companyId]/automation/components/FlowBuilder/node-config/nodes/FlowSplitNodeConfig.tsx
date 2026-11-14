"use client";

interface FlowSplitNodeConfigProps {
  config: Record<string, any>;
  setConfig: (config: any) => void;
}

export function FlowSplitNodeConfig({ config, setConfig }: FlowSplitNodeConfigProps) {
  return (
    <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-xs text-blue-800">
                <strong>Split:</strong> All branches execute in parallel. Useful for sending multiple actions simultaneously or splitting workflows.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Number of Branches
              </label>
              <input
                type="number"
                value={config.branchCount || 2}
                onChange={(e) =>
                  setConfig({ ...config, branchCount: Math.max(2, Math.min(5, parseInt(e.target.value) || 2)) })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer"
                min="2"
                max="5"
              />
              <p className="text-xs text-slate-500 mt-1">
                The flow will split into {config.branchCount || 2} parallel branches. All branches execute simultaneously.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs text-slate-600">
                <strong>Note:</strong> Make sure you connect {config.branchCount || 2} nodes to this Split node's outputs for all branches to execute.
              </p>
            </div>
          </div>
  );
}

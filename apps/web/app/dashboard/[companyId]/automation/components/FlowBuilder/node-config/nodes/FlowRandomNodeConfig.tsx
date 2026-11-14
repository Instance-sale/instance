"use client";

interface FlowRandomNodeConfigProps {
  config: Record<string, any>;
  setConfig: (config: any) => void;
}

export function FlowRandomNodeConfig({ config, setConfig }: FlowRandomNodeConfigProps) {
  const pathCount = config.pathCount || 2;
        const weightsStr = config.weights || "";
        const weightsArray = weightsStr
          ? weightsStr.split(",").map((w: string) => parseFloat(w.trim())).filter((w: number) => !isNaN(w))
          : Array(pathCount).fill(100 / pathCount);
        const weightsSum = weightsArray.reduce((sum: number, w: number) => sum + w, 0);
        const isValid = weightsArray.length === pathCount && Math.abs(weightsSum - 100) < 0.01;
        const normalizedWeights = weightsSum > 0 ? weightsArray.map((w: number) => (w / weightsSum) * 100) : weightsArray;

        return (
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg mb-4">
              <p className="text-xs text-purple-800">
                <strong>Randomizer:</strong> Use for A/B testing different messages. Users will be randomly sent down one path based on weights.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Number of Paths
              </label>
              <input
                type="number"
                value={pathCount}
                onChange={(e) => {
                  const newPathCount = Math.max(2, Math.min(5, parseInt(e.target.value) || 2));
                  const base = Math.floor(100 / newPathCount);
                  const rem = 100 - base * newPathCount;
                  const defaultWeights = Array.from({ length: newPathCount }, (_, idx) => base + (idx < rem ? 1 : 0)).join(",");
                  setConfig({ ...config, pathCount: newPathCount, weights: defaultWeights });
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer"
                min="2"
                max="5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Weights (comma-separated percentages)
              </label>
              <input
                type="text"
                value={
                  weightsStr ||
                  (() => {
                    const base = Math.floor(100 / pathCount);
                    const rem = 100 - base * pathCount;
                    return Array.from({ length: pathCount }, (_, idx) => base + (idx < rem ? 1 : 0)).join(",");
                  })()
                }
                onChange={(e) =>
                  setConfig({ ...config, weights: e.target.value })
                }
                className={`w-full rounded-lg border px-3 py-2 text-sm ${isValid ? "border-slate-200" : "border-red-300"
                  }`}
                placeholder={`e.g., ${Array(pathCount).fill((100 / pathCount).toFixed(0)).join(",")}`}
              />
              {!isValid && weightsStr && (
                <p className="text-xs text-red-600 mt-1">
                  Weights must have {pathCount} values that sum to 100 (current sum: {weightsSum.toFixed(1)}%)
                </p>
              )}
              {isValid && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-slate-700">Path Distribution:</p>
                  {normalizedWeights.map((weight: number, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-600 w-16">Path {index + 1}:</span>
                      <div className="flex-1 bg-stone-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${weight}%` }}
                        />
                      </div>
                      <span className="text-slate-700 w-12 text-right">{weight.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
}

"use client";

export function AutoLikeCommentToggle({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (next: Record<string, unknown>) => void;
}) {
  const enabled = Boolean(config.autoLikeComment);
  return (
    <div className="border-t border-slate-100 pt-3">
      <label className="flex items-start gap-3 p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl cursor-pointer hover:bg-rose-50 transition-colors">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) =>
            setConfig({ ...config, autoLikeComment: e.target.checked })
          }
          className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
        />
        <div className="flex-1">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-rose-900">
            <span>❤️</span>
            <span>Auto-Like User&apos;s Comment</span>
          </div>
          <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
            Automatically sends a Heart to their comment. Triggers an official push notification to their phone, drawing them straight into Instagram when your DM arrives!
          </p>
        </div>
      </label>
    </div>
  );
}

"use client";

export function PlaceholderHelperChips({
  onInsert,
  tokens = ["{name}", "{username}", "{comment}", "{promo}"],
}: {
  onInsert: (token: string) => void;
  tokens?: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1">
      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
        Quick Insert:
      </span>
      {tokens.map((token) => (
        <button
          key={token}
          type="button"
          onClick={() => onInsert(token)}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-mono text-xs font-semibold border border-slate-200 hover:border-blue-300 shadow-xs transition-colors cursor-pointer"
          title={`Click to insert ${token}`}
        >
          <span className="text-blue-500 font-bold">+</span>
          <span>{token}</span>
        </button>
      ))}
    </div>
  );
}

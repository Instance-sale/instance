"use client";

export function AudienceFilterSelector({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (next: Record<string, unknown>) => void;
}) {
  const value = String(config.audienceFilter || "ALL").toUpperCase();

  return (
    <div className="border-t border-slate-100 pt-4 space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
          Audience Targeting
        </label>
        <span className="text-[11px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
          Filter
        </span>
      </div>
      <p className="text-xs text-slate-500">
        Control which contacts are eligible to trigger this automation flow.
      </p>
      <div className="space-y-1.5 pt-1">
        {[
          {
            id: "ALL",
            label: "Everyone (All Leads)",
            desc: "Triggers on all inbound interactions from new and returning leads.",
          },
          {
            id: "FIRST_TIME",
            label: "First-Time Leads Only",
            desc: "Only fires if the user has never messaged your account before (ideal for welcome funnels).",
          },
          {
            id: "RETURNING",
            label: "Returning Contacts Only",
            desc: "Only fires if the user has prior interactions recorded in your CRM.",
          },
        ].map((opt) => (
          <label
            key={opt.id}
            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${value === opt.id
              ? "border-blue-500 bg-blue-50/60 shadow-sm"
              : "border-slate-200 bg-white hover:bg-slate-50/80"
              }`}
          >
            <input
              type="radio"
              name="audienceFilter"
              checked={value === opt.id}
              onChange={() => setConfig({ ...config, audienceFilter: opt.id })}
              className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <div className="flex-1">
              <p className={`font-semibold ${value === opt.id ? "text-blue-900" : "text-slate-800"}`}>
                {opt.label}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                {opt.desc}
              </p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

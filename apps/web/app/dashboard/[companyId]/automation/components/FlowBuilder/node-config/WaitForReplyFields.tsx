"use client";

export function WaitForReplyFields({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (next: Record<string, unknown>) => void;
}) {
  const waitEnabled = config.waitForReplyAfterSend !== false;

  return (
    <div className="border-t border-slate-100 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-slate-700">Wait for their reply</span>
          <p className="text-xs text-slate-500 mt-0.5">
            Pause until they DM again before the next step. Auto-on when the next node is a Condition or Set Variable.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={waitEnabled}
          onClick={() =>
            setConfig({
              ...config,
              waitForReplyAfterSend: config.waitForReplyAfterSend === false ? true : false,
            })
          }
          className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors hover:opacity-90 ${waitEnabled ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 hover:bg-slate-400"
            }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${waitEnabled ? "translate-x-5" : ""
              }`}
          />
        </button>
      </div>
      {waitEnabled && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Capture from their reply
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 hover:text-slate-900">
            <input
              type="checkbox"
              checked={!!config.captureEmail}
              onChange={(e) =>
                setConfig({ ...config, captureEmail: e.target.checked })
              }
              className="h-4 w-4 cursor-pointer rounded border-slate-200"
            />
            <span>Capture email address (saves to CRM)</span>
          </label>
          {!!config.captureEmail && (
            <div className="ml-6 space-y-2.5 rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Retry message if reply is not an email
                </label>
                <input
                  type="text"
                  value={String(config.emailRetryMessage ?? "")}
                  onChange={(e) =>
                    setConfig({ ...config, emailRetryMessage: e.target.value })
                  }
                  placeholder="That doesn't look like a valid email address. Please reply with your email:"
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Sent automatically if the contact's reply doesn't look like a valid email.
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Max retry attempts
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Advances downstream after max retries so flow does not block.
                  </p>
                </div>
                <select
                  value={Number(config.emailMaxRetries ?? 2)}
                  onChange={(e) =>
                    setConfig({ ...config, emailMaxRetries: Number(e.target.value) })
                  }
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value={1}>1 retry</option>
                  <option value={2}>2 retries (recommended)</option>
                  <option value={3}>3 retries</option>
                  <option value={5}>5 retries</option>
                </select>
              </div>
            </div>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 hover:text-slate-900">
            <input
              type="checkbox"
              checked={!!config.capturePhone}
              onChange={(e) =>
                setConfig({ ...config, capturePhone: e.target.checked })
              }
              className="h-4 w-4 cursor-pointer rounded border-slate-200"
            />
            <span>Capture phone number (saves to CRM)</span>
          </label>
          <div className="pt-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Save reply to variable (optional)
            </label>
            <input
              type="text"
              value={String(config.storeReplyAsVariable || "")}
              onChange={(e) =>
                setConfig({ ...config, storeReplyAsVariable: e.target.value.trim() })
              }
              placeholder="e.g. userChoice or userResponse"
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Can be used in subsequent Condition nodes or messages via {"{{variableName}}"}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

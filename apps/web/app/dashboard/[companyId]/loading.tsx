export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen animate-pulse">
      {/* Sidebar skeleton */}
      <aside className="w-60 border-r border-slate-200 bg-white p-4 flex flex-col gap-4 shrink-0">
        <div className="h-10 rounded-lg bg-slate-200 w-3/4" />
        <div className="space-y-2 flex-1">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-10 rounded-xl bg-slate-100" />
          ))}
        </div>
        <div className="h-14 rounded-xl bg-slate-100" />
      </aside>
      {/* Main content skeleton */}
      <main className="flex-1 p-6 lg:p-8 bg-slate-100">
        <div className="max-w-4xl space-y-4">
          <div className="h-8 bg-slate-200 rounded-lg w-1/3" />
          <div className="h-4 bg-slate-100 rounded w-2/3" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-100" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-slate-100 mt-6" />
        </div>
      </main>
    </div>
  );
}

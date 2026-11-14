export default function SetupLoading() {
  return (
    <main className="relative min-h-screen py-12 px-4 sm:px-6">
      <div className="mesh-bg">
        <i className="mesh-a" />
        <i className="mesh-b" />
        <i className="mesh-c" />
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-center">
          <div className="h-8 w-48 rounded-full bg-white/70 animate-pulse border border-white/80" />
        </div>
        <div className="h-16 w-full rounded-2xl bg-white/70 animate-pulse border border-white/80" />
        <div className="glass-panel p-8 space-y-5 animate-pulse">
          <div className="h-6 w-1/3 bg-slate-200/60 rounded-lg" />
          <div className="h-11 w-full bg-slate-200/60 rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-11 bg-slate-200/60 rounded-xl" />
            <div className="h-11 bg-slate-200/60 rounded-xl" />
          </div>
          <div className="h-28 bg-slate-200/60 rounded-xl" />
        </div>
      </div>
    </main>
  );
}

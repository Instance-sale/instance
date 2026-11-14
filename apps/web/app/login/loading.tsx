export default function LoginLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center relative overflow-hidden px-4 bg-gradient-to-b from-[#A6C5E3] to-[#F1E8DC]">
      <section className="w-full max-w-md space-y-8 rounded-2xl bg-white/80 backdrop-blur-md p-8 shadow-xl border border-white/50 relative z-10 animate-pulse">
        <div>
          <div className="h-9 bg-slate-200 rounded-lg w-3/4 mx-auto mb-2" />
          <div className="h-4 bg-slate-100 rounded w-full max-w-xs mx-auto" />
        </div>
        <div className="space-y-4">
          <div className="h-12 bg-slate-100 rounded-xl w-full" />
          <div className="flex justify-center">
            <div className="h-4 bg-slate-100 rounded w-32" />
          </div>
          <div className="h-12 bg-slate-100 rounded-xl w-full" />
          <div className="h-4 bg-slate-100 rounded w-24 mx-auto" />
        </div>
      </section>
    </main>
  );
}

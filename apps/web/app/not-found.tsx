import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found | 404",
  description: "Sorry, the page you are looking for doesn't exist or has been moved.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#A6C5E3] to-[#F1E8DC]">
      <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 text-center space-y-6">
        <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-[0.05em] text-slate-700 bg-white/60 rounded-full">
          Page Not Found • 404
        </span>
        <h1 className="text-3xl font-bold text-[#1A1A1A] tracking-tight">
          Page not found
        </h1>
        <p className="text-sm text-slate-600">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/dashboard"
            className="w-full py-3 px-4 bg-[#1A1A1A] hover:bg-black text-white font-medium rounded-full transition-colors shadow-sm text-center"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-full border border-gray-200 transition-colors shadow-sm text-center"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}

"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { logger } from "@/lib/logger";
import { toast } from "@/lib/toast";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email is already registered with another sign-in method (e.g. magic link). Use that method to sign in, or try Google again - we now link accounts for the same email.",
  OAuthSignin: "Error starting the sign-in process. Please try again.",
  OAuthCallback: "Error during sign-in. Please try again.",
  OAuthCreateAccount: "Could not create account. Please try again.",
  EmailCreateAccount: "Could not create account. Please try again.",
  Callback: "An error occurred during sign-in. Please try again.",
  EmailSignin: "Could not send the sign-in email. Please try again.",
  CredentialsSignin: "Invalid credentials. Please try again.",
  SessionRequired: "Please sign in to continue.",
  Default: "Something went wrong. Please try again.",
};

function LoginContent() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const errorMessage = errorCode ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default) : null;
  const rawCallbackUrl = searchParams.get("callbackUrl");
  const isValidCallback = Boolean(
    rawCallbackUrl &&
      rawCallbackUrl.startsWith("/") &&
      !rawCallbackUrl.startsWith("//") &&
      !rawCallbackUrl.startsWith("/\\")
  );
  const callbackUrl = isValidCallback && rawCallbackUrl ? rawCallbackUrl : "/dashboard";

  const [emailSent, setEmailSent] = useState(false);

  const checkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = (data && typeof data.error === "string") ? data.error : "Something went wrong. Please try again.";
        toast.error("Sign-in error", msg);
        setIsLoading(false);
        return;
      }

      const exists = data && typeof data.exists === "boolean" ? data.exists : false;
      setEmailExists(exists);

      if (exists) {
        // Email exists, show auth options
      } else {
        router.push(`/signup?email=${encodeURIComponent(email)}`);
      }
    } catch (error) {
      logger.error("Check email error:", error);
      toast.error("Sign-in error", "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setIsLoading(true);
    setEmailSent(false);
    try {
      const res = await signIn("email", {
        email,
        redirect: false,
        callbackUrl,
      });

      if (res?.ok) setEmailSent(true);
    } catch (error) {
      logger.error("Email login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signIn("google", {
        callbackUrl,
      });
    } catch (error) {
      logger.error("Google login error:", error);
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center relative overflow-hidden px-4 bg-gradient-to-b from-[#A6C5E3] to-[#F1E8DC]">
      <section className="w-full max-w-md space-y-8 rounded-2xl bg-white/80 backdrop-blur-md p-8 shadow-xl border border-white/50 relative z-10" aria-labelledby="login-heading">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20 border border-white/80">
            <Image
              src="/instance-square.webp"
              alt="Instance"
              width={48}
              height={48}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <h1 id="login-heading" className="mt-4 text-center text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            Sign in to access your dashboard
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Google Authentication - Always visible */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
            aria-label="Sign in with Google"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white/50 backdrop-blur-sm px-2 text-slate-500">Or continue with email</span>
            </div>
          </div>
        </div>

        {emailExists === null ? (
          <form onSubmit={checkEmail} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 ml-1 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 placeholder-slate-400 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full cursor-pointer justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 transform hover:scale-[1.02]"
              aria-label={isLoading ? "Checking email" : "Continue with email"}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking...
                </span>
              ) : "Continue"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email found! Sign in with magic link:
              </p>
            </div>

            <button
              type="button"
              onClick={handleEmailLogin}
              disabled={isLoading}
              className="flex w-full cursor-pointer justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 transform hover:scale-[1.02]"
              aria-label={isLoading ? "Sending magic link" : "Send magic link to email"}
            >
              {isLoading ? "Sending Link..." : "Send Magic Link"}
            </button>

            {emailSent && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                Magic link sent. Please check your email inbox (and spam folder).
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setEmailExists(null);
                setEmail("");
                setEmailSent(false);
              }}
              className="w-full cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
              aria-label="Use a different email address"
            >
              Use a different email
            </button>
          </div>
        )}

        <p className="text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-500 hover:underline">
            Sign up for free
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center px-4 bg-gradient-to-b from-[#A6C5E3] to-[#F1E8DC]">
        <div className="text-slate-600">Loading...</div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}

'use client'

import { Suspense } from "react"
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Suspense fallback={null}>
        {children}
      </Suspense>
      <Toaster />
    </SessionProvider>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Login to Your Account",
  description: "Sign in to your Instance account to access your Open source Sales CRM for Instagram.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

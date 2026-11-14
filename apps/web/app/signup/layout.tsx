import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | Create Your Account",
  description: "Create your Instance account and access your Open source Sales CRM for Instagram.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

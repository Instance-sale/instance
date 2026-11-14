import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup | Instance",
  description: "Complete your Instance setup to start managing your Open source Sales CRM for Instagram.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

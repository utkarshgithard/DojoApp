import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Study Room Chat",
  description: "Real-time chat for your study session with friends.",
  robots: { index: false, follow: false },
};

export default function SessionChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No Navbar, no top padding — full viewport chat experience
  return <>{children}</>;
}

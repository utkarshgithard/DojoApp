"use client";
import { E2EEProvider } from "@/context/E2EEContext";

export default function SessionChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No Navbar, no top padding — full viewport chat experience
  // E2EEProvider is scoped here so it only runs on the chat page
  return <E2EEProvider>{children}</E2EEProvider>;
}

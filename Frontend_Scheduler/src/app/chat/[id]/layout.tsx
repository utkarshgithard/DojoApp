"use client";
import { E2EEProvider } from "@/context/E2EEContext";

export default function SessionChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <E2EEProvider>{children}</E2EEProvider>;
}
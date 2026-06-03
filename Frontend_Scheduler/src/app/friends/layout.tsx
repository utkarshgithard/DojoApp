import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Friends & Connections",
  description: "Manage your friends list and share your invite code.",
  robots: { index: false, follow: false },
};

export default function FriendsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

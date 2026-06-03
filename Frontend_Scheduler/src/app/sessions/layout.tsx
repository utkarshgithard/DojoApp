import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Study Sessions",
  description: "Join or host live study sessions with your DojoClass friends.",
  robots: { index: false, follow: false },
};

export default function SessionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

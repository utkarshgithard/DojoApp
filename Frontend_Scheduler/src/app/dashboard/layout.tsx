import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "View your attendance stats, mark today's classes, and track your 75% attendance threshold across all subjects.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

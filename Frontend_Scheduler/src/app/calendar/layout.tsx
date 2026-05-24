import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar",
  description:
    "View your class schedule and attendance history on a calendar. See past and upcoming classes at a glance.",
  robots: { index: false, follow: false },
};

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

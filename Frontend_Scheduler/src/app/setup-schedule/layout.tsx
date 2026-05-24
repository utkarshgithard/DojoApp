import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup Schedule",
  description:
    "Set up your weekly class schedule on DojoClass. Add subjects, time slots, and recurring classes.",
  robots: { index: false, follow: false },
};

export default function SetupScheduleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

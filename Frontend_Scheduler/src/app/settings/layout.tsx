import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Manage your DojoClass account settings, notification preferences, and profile.",
  robots: { index: false, follow: false },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read the DojoClass Privacy Policy to understand how we protect, collect, and use your personal information and academic records securely.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

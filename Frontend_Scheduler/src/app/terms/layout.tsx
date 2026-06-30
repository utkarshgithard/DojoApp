import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the DojoClass Terms of Service to understand account registration rules, permitted usage of study rooms, and calculation disclaimers.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

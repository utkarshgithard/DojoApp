import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In",
  description:
    "Sign in to your DojoClass account to track your college attendance, view stats, and manage your schedule.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

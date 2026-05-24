import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Sign up for DojoClass and start tracking your college attendance in seconds. Free for all students.",
  robots: { index: false, follow: false },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

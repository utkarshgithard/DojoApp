import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn more about DojoClass, our mission to support college students with smart attendance tracking, study rooms, and a vibrant campus community.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

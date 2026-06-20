import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community',
  description: 'Share updates, training highlights and connect with the dojo community.',
  robots: { index: false, follow: false },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}

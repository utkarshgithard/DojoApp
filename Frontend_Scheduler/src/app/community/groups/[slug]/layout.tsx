import type { Metadata } from 'next';
import { getPublicApiUrl, SITE_URL } from '@/lib/publicPostMetadata';

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const communityUrl = `${SITE_URL}/community/groups/${slug}`;

  try {
    const response = await fetch(`${getPublicApiUrl()}/groups/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) throw new Error('Community not found');

    const data = await response.json();
    const community = data.community;
    const title = community?.name ? `${community.name} on DojoClass` : 'DojoClass community';
    const description = community?.description?.trim() || 'Connect, learn, and grow with fellow students on DojoClass.';

    return {
      title,
      description,
      openGraph: {
        type: 'website',
        url: communityUrl,
        siteName: 'DojoClass',
        title,
        description,
        images: community?.bannerUrl ? [{ url: community.bannerUrl, alt: community.name }] : [`${SITE_URL}/opengraph-image`],
      },
      twitter: { card: 'summary_large_image', title, description, images: community?.bannerUrl ? [community.bannerUrl] : [`${SITE_URL}/opengraph-image`] },
      alternates: { canonical: communityUrl },
    };
  } catch {
    return {
      title: 'DojoClass community',
      description: 'Connect, learn, and grow with fellow students on DojoClass.',
      openGraph: { type: 'website', url: communityUrl, siteName: 'DojoClass', images: [`${SITE_URL}/opengraph-image`] },
    };
  }
}

export default function CommunityGroupLayout({ children }: Props) {
  return <>{children}</>;
}

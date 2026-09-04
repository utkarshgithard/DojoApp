import type { Metadata } from 'next';
import { SITE_URL, getPostPreviewUrl, getPostShareUrl, getPublicApiUrl } from '@/lib/publicPostMetadata';

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${getPublicApiUrl()}/community/posts/${id}`, {
      next: { revalidate: 60 }, // refresh OG data every 60s
    });

    if (!res.ok) throw new Error('not found');

    const data = await res.json();
    const post = data.post;

    const title = post?.author?.name
      ? `${post.author.name} on DojoClass`
      : 'Post on DojoClass';

    const description = post?.author?.name
      ? `See what ${post.author.name} is saying about this on DojoClass.`
      : 'See what this user is saying about this on DojoClass.';

    // The generated card combines the post image with its text. This avoids
    // WhatsApp showing only the raw image and makes the preview consistent.
    const ogImage = getPostPreviewUrl(id);
    const postUrl = getPostShareUrl(id);

    return {
      title,
      description,
      openGraph: {
        type: 'article',
        url: postUrl,
        siteName: 'DojoClass',
        title,
        description,
        images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
      alternates: { canonical: postUrl },
    };
  } catch {
    return {
      title: 'Post on DojoClass',
      description: 'DojoClass community post.',
      openGraph: {
        type: 'article',
        url: getPostShareUrl(id),
        siteName: 'DojoClass',
        images: [`${SITE_URL}/opengraph-image`],
      },
    };
  }
}

// This is a server layout — it wraps the 'use client' page.tsx
// and is the only place Next.js can inject per-route metadata.
export default function PostLayout({ children }: Props) {
  return <>{children}</>;
}

import type { Metadata } from 'next';

const SITE_URL = 'https://dojoclass.space';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dojoapp-1.onrender.com/api';

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
    const res = await fetch(`${API_URL}/community/posts/${id}`, {
      next: { revalidate: 60 }, // refresh OG data every 60s
    });

    if (!res.ok) throw new Error('not found');

    const data = await res.json();
    const post = data.post;

    const title = post?.author?.name
      ? `${post.author.name} on DojoClass`
      : 'Post on DojoClass';

    const description = post?.content
      ? post.content.slice(0, 157) + (post.content.length > 157 ? '…' : '')
      : 'Check out this post on DojoClass.';

    // Prefer the first image attachment for og:image;
    // otherwise Next.js will automatically use the opengraph-image.tsx
    // in this same directory, which renders the post content as a card.
    const ogImage =
      post?.media?.[0]?.type === 'image'
        ? post.media[0].url
        : `${SITE_URL}/community/post/${id}/opengraph-image`;

    const postUrl = `${SITE_URL}/community/post/${id}`;

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
      description: 'Check out this post on DojoClass — the all-in-one student tool.',
      openGraph: {
        type: 'article',
        url: `${SITE_URL}/community/post/${id}`,
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

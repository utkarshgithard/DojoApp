import type { Metadata } from 'next';

const SITE_URL = 'https://dojoclass.space';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dojoapp-1.onrender.com/api';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${API_URL}/community/posts/${id}`, {
      // Revalidate every 60s so edited posts propagate quickly
      next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error('Post not found');

    const data = await res.json();
    const post = data.post;

    const title = post?.author?.name
      ? `${post.author.name} on DojoClass`
      : 'Post on DojoClass';

    // Trim content for description (max 160 chars)
    const description = post?.content
      ? post.content.slice(0, 157) + (post.content.length > 157 ? '…' : '')
      : 'Check out this post on DojoClass.';

    // Use first media image if available, otherwise fall back to site OG image
    const ogImage =
      post?.media?.[0]?.type === 'image'
        ? post.media[0].url
        : `${SITE_URL}/opengraph-image`;

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
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
      alternates: {
        canonical: postUrl,
      },
    };
  } catch {
    // Fallback metadata if the fetch fails (post deleted, network error, etc.)
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

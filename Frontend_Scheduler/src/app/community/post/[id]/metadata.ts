import type { Metadata } from 'next';
import { SITE_URL, getPostPreviewUrl, getPostShareUrl, getPublicApiUrl } from '@/lib/publicPostMetadata';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${getPublicApiUrl()}/community/posts/${id}`, {
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
    const description = post?.author?.name
      ? `Read this post by ${post.author.name} on DojoClass.`
      : 'Read this post by this user on DojoClass.';

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
      description: 'DojoClass community post.',
      openGraph: {
        type: 'article',
        url: `${SITE_URL}/community/post/${id}`,
        siteName: 'DojoClass',
        images: [`${SITE_URL}/opengraph-image`],
      },
    };
  }
}

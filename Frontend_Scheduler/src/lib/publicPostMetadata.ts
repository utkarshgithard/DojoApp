const DEFAULT_API_URL = 'https://dojoapp-1.onrender.com';

export const SITE_URL = 'https://dojoclass.space';

export function getPublicApiUrl(): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API_URL;
  const normalizedUrl = configuredUrl.replace(/\/+$/, '');

  return normalizedUrl.endsWith('/api')
    ? normalizedUrl
    : `${normalizedUrl}/api`;
}

export function getPostShareUrl(postId: string): string {
  return `${SITE_URL}/community/post/${postId}`;
}

export function getPostPreviewUrl(postId: string): string {
  return `${getPostShareUrl(postId)}/opengraph-image`;
}

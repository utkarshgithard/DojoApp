"use client";

/**
 * SafeImage — an <img> that swaps to a fallback node instead of rendering a
 * broken image. Use it for community banners (fallback: nothing — the
 * container's gradient shows) and group avatars (fallback: initial letter).
 *
 * Covers the same class of bug as SafeAvatar: missing URL (new communities
 * that never uploaded an image) or failed load (403 from storage, deleted
 * object, network error).
 */

import React, { useEffect, useState } from "react";

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  /** Rendered instead of the image when src is missing or fails to load. */
  fallback?: React.ReactNode;
}

export default function SafeImage({ src, alt, className, style, fallback = null }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  // A new/edited URL gets a fresh chance to load.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

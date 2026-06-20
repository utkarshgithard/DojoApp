'use client';

import React, { useState } from 'react';
import CommunityVideoPlayer from './CommunityVideoPlayer';
import { X } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string | null;
}

interface CommunityMediaGridProps {
  media: MediaItem[];
}

export default function CommunityMediaGrid({ media }: CommunityMediaGridProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (!media || media.length === 0) return null;

  const images = media.filter((m) => m.type === 'image');
  const videos = media.filter((m) => m.type === 'video');

  // Grid layout helpers
  const gridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    return 'grid-cols-2';
  };

  return (
    <div className="mt-3 space-y-2">
      {/* Videos — always full-width stacked */}
      {videos.map((v) => (
        <CommunityVideoPlayer
          key={v.id}
          src={v.url}
          thumbnailUrl={v.thumbnailUrl}
          className="w-full"
        />
      ))}

      {/* Images — responsive grid */}
      {images.length > 0 && (
        <div className={`grid ${gridClass(images.length)} gap-1.5`}>
          {images.slice(0, 4).map((img, idx) => {
            const isLast = idx === 3 && images.length > 4;
            const remaining = images.length - 4;
            return (
              <div
                key={img.id}
                className={`relative overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 cursor-pointer group
                  ${images.length === 1 ? 'aspect-[16/9]' : 'aspect-square'}
                  ${images.length === 3 && idx === 0 ? 'row-span-2' : ''}
                `}
                onClick={() => setLightbox(img.url)}
              >
                <img
                  src={img.url}
                  alt={`Post image ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                {/* +N overlay for 5th+ images */}
                {isLast && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">+{remaining + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <img
            src={lightbox}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

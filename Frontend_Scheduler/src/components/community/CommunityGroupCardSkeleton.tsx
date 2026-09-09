'use client';

import React from 'react';

/**
 * Skeleton placeholder that mirrors CommunityGroupCard's exact layout
 * (banner, overlapping avatar, name, slug, visibility pill, description,
 * stats row and join button) so the grid doesn't shift when data arrives.
 */
export default function CommunityGroupCardSkeleton({ dark }: { dark: boolean }) {
  const border = dark ? 'border-zinc-800' : 'border-zinc-200';
  const card = dark ? 'bg-zinc-900' : 'bg-white';
  const shimmer = dark ? 'bg-zinc-800' : 'bg-zinc-200';

  return (
    <div className={`rounded-md border overflow-hidden animate-pulse ${border} ${card}`} aria-hidden="true">
      {/* Banner + overlapping avatar */}
      <div className="relative">
        <div className={`h-20 ${dark ? 'bg-zinc-800/70' : 'bg-zinc-100'}`} />
        <div className={`absolute -bottom-5 left-4 w-10 h-10 rounded-xl border-2 ${border} ${shimmer}`} />
      </div>

      <div className="p-4 pt-7">
        {/* Name + slug + visibility pill */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className={`h-4 w-3/4 rounded ${shimmer}`} />
            <div className={`h-2.5 w-1/3 rounded ${shimmer}`} />
          </div>
          <div className={`h-4 w-14 rounded-full shrink-0 mt-0.5 ${shimmer}`} />
        </div>

        {/* Description lines */}
        <div className="space-y-1.5 mb-3">
          <div className={`h-3 w-full rounded ${shimmer}`} />
          <div className={`h-3 w-5/6 rounded ${shimmer}`} />
        </div>

        {/* Stats + join button */}
        <div className="flex items-center justify-between mt-3">
          <div className={`h-3 w-20 rounded ${shimmer}`} />
          <div className={`h-7 w-14 rounded-xl ${shimmer}`} />
        </div>
      </div>
    </div>
  );
}

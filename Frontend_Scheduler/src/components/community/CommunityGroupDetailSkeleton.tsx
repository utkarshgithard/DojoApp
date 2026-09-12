'use client';

import React from 'react';

/**
 * Skeleton placeholder for the community group detail page.
 * Mirrors the real layout — banner, overlapping header card (avatar, name,
 * meta, action buttons) and the posts feed — so nothing shifts when data
 * arrives. Replaces the previous centered spinner.
 */
export default function CommunityGroupDetailSkeleton({ dark }: { dark: boolean }) {
  const shimmer = dark ? 'bg-zinc-800' : 'bg-zinc-200';
  const shimmerSoft = dark ? 'bg-zinc-800/60' : 'bg-zinc-100';
  const card = dark ? 'bg-zinc-950/90 border-zinc-800/80' : 'bg-white/95 border-zinc-200/80';

  return (
    <div
      className={`min-h-screen pt-[50px] md:pt-0 ${dark ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f5]'}`}
      aria-hidden="true"
      role="status"
      aria-label="Loading community"
    >
      {/* Banner */}
      <div className={`relative h-40 sm:h-56 overflow-hidden ${shimmerSoft} animate-pulse`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />
      </div>

      <div className="max-w-[1140px] mx-auto px-4">
        {/* Header card overlapping the banner */}
        <div className={`relative -mt-14 sm:-mt-16 mb-6 rounded-2xl border p-5 sm:p-6 backdrop-blur-xl shadow-xl animate-pulse ${card}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            {/* Avatar block */}
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shrink-0 ${shimmer}`} />

            {/* Name + meta + description */}
            <div className="flex-1 min-w-0 space-y-3 py-1">
              <div className="flex items-center gap-3">
                <div className={`h-6 sm:h-7 w-44 rounded-md ${shimmer}`} />
                <div className={`h-4 w-16 rounded-full ${shimmer}`} />
              </div>
              <div className="flex items-center gap-3">
                <div className={`h-3 w-24 rounded ${shimmer}`} />
                <div className={`h-3 w-28 rounded ${shimmer}`} />
                <div className={`h-3 w-20 rounded ${shimmer}`} />
              </div>
              <div className={`h-3 w-3/4 max-w-md rounded ${shimmer}`} />
            </div>

            {/* Action buttons */}
            <div className="hidden sm:flex items-center gap-2.5 shrink-0">
              <div className={`h-9 w-20 rounded-xl ${shimmer}`} />
              <div className={`h-9 w-24 rounded-xl ${shimmer}`} />
              <div className={`h-9 w-28 rounded-xl ${shimmer}`} />
            </div>
          </div>
        </div>

        {/* Posts feed */}
        <div className="xl:grid xl:grid-cols-[minmax(0,680px)_340px] xl:gap-6 xl:items-start">
          <div className="w-full space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`rounded-2xl border p-5 sm:p-6 animate-pulse ${card}`}
              >
                <div className="flex gap-3.5 mb-4">
                  <div className={`w-10 h-10 rounded-full shrink-0 ${shimmer}`} />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className={`h-3.5 w-36 rounded-md ${shimmer}`} />
                    <div className={`h-2.5 w-24 rounded-md ${shimmer}`} />
                  </div>
                </div>
                <div className="space-y-2 mb-3">
                  <div className={`h-3.5 rounded-md ${shimmer}`} />
                  <div className={`h-3.5 rounded-md w-3/4 ${shimmer}`} />
                </div>
                <div className="flex gap-5 pt-1">
                  <div className={`h-3 w-14 rounded ${shimmer}`} />
                  <div className={`h-3 w-14 rounded ${shimmer}`} />
                  <div className={`h-3 w-14 rounded ${shimmer}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Right sidebar (desktop) */}
          <div className="hidden xl:block space-y-4">
            <div className={`rounded-2xl border p-5 animate-pulse ${card}`}>
              <div className={`h-4 w-28 rounded mb-4 ${shimmer}`} />
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-full ${shimmer}`} />
                <div className="flex-1 space-y-1.5">
                  <div className={`h-3 w-24 rounded ${shimmer}`} />
                  <div className={`h-2.5 w-16 rounded ${shimmer}`} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full ${shimmer}`} />
                <div className="flex-1 space-y-1.5">
                  <div className={`h-3 w-20 rounded ${shimmer}`} />
                  <div className={`h-2.5 w-24 rounded ${shimmer}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

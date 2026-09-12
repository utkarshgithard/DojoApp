"use client";

/**
 * SafeAvatar — avatar with a graceful fallback chain.
 *
 * Renders the user's photo when it loads, and automatically falls back to a
 * colored-initials avatar when:
 *  - avatarUrl is missing (new users who never uploaded a photo), or
 *  - the image fails to load (broken URL, 403, deleted bucket object, etc.)
 *
 * This fixes the "blank/broken avatar" problem everywhere avatars are shown:
 * chat page, chat list, @mention dropdowns, comments, posts, friends list.
 */

import React, { useEffect, useMemo, useState } from "react";

const PALETTE = [
  ["from-indigo-500", "to-purple-600"],
  ["from-pink-500", "to-rose-600"],
  ["from-emerald-500", "to-teal-600"],
  ["from-amber-500", "to-orange-600"],
  ["from-blue-500", "to-cyan-600"],
  ["from-violet-500", "to-fuchsia-600"],
  ["from-teal-500", "to-emerald-600"],
];

function pickPalette(name: string): [string, string] {
  const idx = (name || "?").charCodeAt(0) % PALETTE.length;
  return [PALETTE[idx][0], PALETTE[idx][1]];
}

interface SafeAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  /** Extra classes for the wrapper (rounded ring, shrink-0, etc.). */
  className?: string;
  /** Extra classes for the initials fallback block. */
  fallbackClassName?: string;
  /** Breakpoints text size for the initials. */
  fontSize?: number;
}

export default function SafeAvatar({
  name,
  avatarUrl,
  size = 44,
  className = "",
  fallbackClassName = "",
  fontSize,
}: SafeAvatarProps) {
  const [failed, setFailed] = useState(false);

  // Reset the error state whenever a new URL arrives so a fixed avatar can recover.
  useEffect(() => {
    setFailed(false);
  }, [avatarUrl]);

  const initials = useMemo(
    () =>
      (name || "U")
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "U",
    [name]
  );

  const [c1, c2] = useMemo(() => pickPalette(name || "?"), [name]);

  // No URL at all → straight to initials (new users who never uploaded).
  if (!avatarUrl || failed) {
    return (
      <div
        style={{ width: size, height: size, fontSize: fontSize ?? Math.max(10, size * 0.38) }}
        className={`rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br ${c1} ${c2} shrink-0 ${className} ${fallbackClassName}`}
        aria-label={name}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className={`rounded-full object-cover shrink-0 ${className}`}
    />
  );
}

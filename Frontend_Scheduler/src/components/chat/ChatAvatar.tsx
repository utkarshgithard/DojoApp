"use client";

import React, { useState } from "react";

const COLORS = {
  ink: "#15131F",
  paper: "#F3F1FA",
  panel: "#FFFFFF",
  line: "#E7E3F3",
  violet: "#6C3CE9",
  violetDeep: "#4A22B0",
  pulse: "#25C77E",
  ember: "#FF5D5D",
  muted: "#8D89A3",
};

const AVATAR_PALETTE = [
  ["#6C3CE9", "#9B7BF2"], // Violet
  ["#25C77E", "#7FE0AC"], // Emerald
  ["#FF5D5D", "#FF9B8A"], // Ember
  ["#F2A93C", "#FCCB7C"], // Orange
  ["#3CA9E9", "#7FCBF2"], // Blue
  ["#E93C8F", "#F27BB6"], // Pink
];

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

interface ChatAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: number;
  online?: boolean;
  ring?: boolean;
}

export default function ChatAvatar({ name, avatarUrl, size = 44, online = false, ring = false }: ChatAvatarProps) {
  const [c1, c2] = AVATAR_PALETTE[hashName(name || "User") % AVATAR_PALETTE.length];
  // Broken avatar URLs (403 from storage, deleted object, etc.) must never
  // render as a blank circle — fall back to the initials avatar instead.
  const [imgFailed, setImgFailed] = useState(false);
  React.useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  const initials = (name || "User")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {ring && (
        <div
          className="dark:border-zinc-800"
          style={{
            position: "absolute",
            inset: -3,
            borderRadius: "50%",
            background: online
              ? `conic-gradient(${COLORS.pulse}, ${COLORS.pulse})`
              : "transparent",
            border: online ? "none" : `2px dashed ${COLORS.line}`,
          }}
        />
      )}
      
      {avatarUrl && !imgFailed ? (
        <div
          style={{
            position: "absolute",
            inset: ring ? 3 : 0,
            borderRadius: "50%",
            overflow: "hidden",
            background: COLORS.paper
          }}
        >
          <img src={avatarUrl} alt={name} onError={() => setImgFailed(true)} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            inset: ring ? 3 : 0,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${c1}, ${c2})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 700,
            fontSize: size * 0.36,
            letterSpacing: "-0.02em",
          }}
          className="font-sans"
        >
          {initials}
        </div>
      )}

      {online && (
        <div
          className="dark:border-zinc-900 border-white"
          style={{
            position: "absolute",
            bottom: -1,
            right: -1,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: "50%",
            background: COLORS.pulse,
            borderWidth: 2.5,
            borderStyle: "solid",
          }}
        />
      )}
    </div>
  );
}

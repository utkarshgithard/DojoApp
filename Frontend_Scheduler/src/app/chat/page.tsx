"use client";

import React from "react";
import { useDarkMode } from "@/context/DarkModeContext";
import { MessageSquare, ShieldCheck, Zap } from "lucide-react";

export default function ChatIndexPage() {
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;
  const muted = dark ? "text-zinc-550" : "text-zinc-400";

  return (
    <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center ${dark ? "bg-[#050505]" : "bg-[#fafafa]"}`}>
      <div className="max-w-md flex flex-col items-center gap-5">
        {/* Animated Icon Bubble */}
        <div className={`
          w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg relative animate-bounce duration-1000
          ${dark 
            ? "bg-zinc-900/60 border border-zinc-800 text-indigo-400" 
            : "bg-white border border-zinc-150 text-indigo-500"
          }
        `}>
          <MessageSquare size={28} />
          <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
          </span>
        </div>

        {/* Text */}
        <div className="space-y-2 mt-2">
          <h2 className="text-[19px] font-bold tracking-tight">Dojo Direct Messenger</h2>
          <p className={`text-[12.5px] max-w-sm ${dark ? "text-zinc-400" : "text-zinc-500"} leading-relaxed`}>
            Select a friend from the left sidebar to start a real-time, peer-to-peer study session conversation.
          </p>
        </div>

        {/* Features list */}
        <div className={`w-full grid grid-cols-2 gap-3 pt-4 border-t border-dashed ${dark ? "border-zinc-850" : "border-zinc-200"}`}>
          <div className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 ${dark ? "bg-zinc-950/40 border-zinc-850" : "bg-white border-zinc-150"}`}>
            <ShieldCheck size={16} className="text-emerald-500" />
            <span className="text-[11.5px] font-bold">End-to-End Encrypted</span>
            <span className={`text-[9.5px] ${muted}`}>Keys established peer-to-peer</span>
          </div>

          <div className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 ${dark ? "bg-zinc-950/40 border-zinc-850" : "bg-white border-zinc-150"}`}>
            <Zap size={16} className="text-amber-500" />
            <span className="text-[11.5px] font-bold">Real-time WebRTC Call</span>
            <span className={`text-[9.5px] ${muted}`}>Audio and video call support</span>
          </div>
        </div>
      </div>
    </div>
  );
}

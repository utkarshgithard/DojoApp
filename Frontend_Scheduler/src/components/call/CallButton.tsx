import React from 'react';
import { Video, Loader2 } from 'lucide-react';

interface CallButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  tooltipText?: string;
  dark?: boolean;
}

export function CallButton({
  onClick,
  disabled = false,
  loading = false,
  tooltipText,
  dark = true,
}: CallButtonProps) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all active:scale-95 shrink-0
          ${
            disabled
              ? dark
                ? 'border-gray-800 text-gray-600 bg-zinc-950/20 cursor-not-allowed'
                : 'border-gray-200 text-gray-300 bg-zinc-50/20 cursor-not-allowed'
              : dark
              ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/8 hover:bg-emerald-500/15 shadow-sm shadow-emerald-500/10'
              : 'border-emerald-500/40 text-emerald-600 bg-emerald-50 hover:bg-emerald-100/60 shadow-sm shadow-emerald-500/5'
          }
        `}
        aria-label="Start call"
      >
        {loading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Video size={13} />
        )}
        <span className="hidden sm:inline">Start Call</span>
      </button>

      {disabled && tooltipText && (
        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50
          ${dark ? 'bg-zinc-800 text-gray-200' : 'bg-gray-800 text-white'}`}
        >
          {tooltipText}
          <div className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent
            ${dark ? 'border-t-zinc-800' : 'border-t-gray-800'}`}
          />
        </div>
      )}
    </div>
  );
}

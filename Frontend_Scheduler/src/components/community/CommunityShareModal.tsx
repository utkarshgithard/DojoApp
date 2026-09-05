'use client';

import React, { useState } from 'react';
import { Check, Copy, Share2, X } from 'lucide-react';
import { toast } from 'sonner';

interface CommunityShareModalProps {
  communityName: string;
  communityDescription?: string | null;
  communitySlug: string;
  dark: boolean;
  onClose: () => void;
}

function BrandIcon({ brand }: { brand: 'whatsapp' | 'facebook' | 'linkedin' | 'x' }) {
  if (brand === 'facebook') return <span className="text-[18px] font-black leading-none">f</span>;
  if (brand === 'linkedin') return <span className="text-[15px] font-black leading-none">in</span>;
  if (brand === 'x') return <span className="text-[15px] font-bold leading-none">X</span>;
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M20.5 3.5A11.86 11.86 0 0 0 12.05 0C5.5 0 .17 5.33.17 11.88c0 2.1.55 4.15 1.6 5.96L.06 24l6.3-1.65a11.85 11.85 0 0 0 5.68 1.44h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.18-1.24-6.16-3.43-8.41ZM12.05 21.8h-.01a9.88 9.88 0 0 1-5.04-1.38l-.36-.21-3.74.98 1-3.64-.23-.37a9.87 9.87 0 0 1-1.51-5.3C2.16 6.43 6.59 2 12.05 2c2.65 0 5.14 1.03 7.01 2.9a9.84 9.84 0 0 1 2.9 7.01c0 5.46-4.44 9.89-9.91 9.89Zm5.43-7.4c-.3-.15-1.78-.88-2.05-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.18.2-.35.23-.65.08-1.78-.89-2.95-1.59-4.13-3.6-.31-.53.31-.49.89-1.63.1-.2.05-.38-.03-.53-.08-.15-.68-1.64-.93-2.25-.25-.6-.5-.52-.68-.53h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.49 1.72.63.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35Z" />
    </svg>
  );
}

export default function CommunityShareModal({
  communityName,
  communityDescription,
  communitySlug,
  dark,
  onClose,
}: CommunityShareModalProps) {
  const [copied, setCopied] = useState(false);
  const communityUrl = `https://dojoclass.space/community/groups/${communitySlug}`;
  const description = communityDescription?.trim() || 'Connect, learn, and grow with fellow students on DojoClass.';
  const shareText = `Join “${communityName}” on DojoClass — ${description}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(communityUrl);
      setCopied(true);
      toast.success('Community link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy community link');
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: `${communityName} on DojoClass`, text: shareText, url: communityUrl });
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') toast.error('Could not open the share menu');
    }
  };

  const openSocialShare = (url: string) => window.open(url, '_blank', 'noopener,noreferrer,width=640,height=600');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl ${dark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
        <div className={`flex items-center justify-between p-4 border-b ${dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
          <div>
            <h2 className="text-[16px] font-bold">Share community</h2>
            <p className={`text-[12px] mt-0.5 ${dark ? 'text-zinc-500' : 'text-zinc-500'}`}>{communityName}</p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${dark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          <p className={`text-[13px] leading-relaxed mb-3 ${dark ? 'text-zinc-300' : 'text-zinc-600'}`}>{shareText}</p>
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] ${dark ? 'border-zinc-800 bg-zinc-900 text-zinc-400' : 'border-zinc-200 bg-zinc-50 text-zinc-500'}`}>
            <span className="truncate">{communityUrl}</span>
            <button onClick={copyLink} className={`ml-auto shrink-0 rounded-md px-2 py-1 font-semibold ${copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
          <div className="flex items-center justify-center gap-3 mt-5">
            <button onClick={nativeShare} title="Share using device" className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white"><Share2 size={19} /></button>
            <button onClick={() => openSocialShare(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${communityUrl}`)}`)} title="WhatsApp" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white"><BrandIcon brand="whatsapp" /></button>
            <button onClick={() => openSocialShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(communityUrl)}`)} title="Facebook" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-white"><BrandIcon brand="facebook" /></button>
            <button onClick={() => openSocialShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(communityUrl)}`)} title="LinkedIn" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A66C2] text-white"><BrandIcon brand="linkedin" /></button>
            <button onClick={() => openSocialShare(`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(communityUrl)}`)} title="X" className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white"><BrandIcon brand="x" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

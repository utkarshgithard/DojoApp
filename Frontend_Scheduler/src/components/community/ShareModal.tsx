'use client';

import React, { useEffect, useState, useCallback } from 'react';
import API from '@/lib/axios';
import { X, Send, Search, CheckCircle2, Loader2, Link2, Share2 } from 'lucide-react';
import { useNetwork } from '@/context/NetworkContext';
import { toast } from 'sonner';

interface ShareModalProps {
  postId: string;
  post?: {
    content: string;
    author: { name: string; avatarUrl?: string | null };
    media?: { url: string; type: string; thumbnailUrl?: string | null }[];
    community?: { name: string } | null;
  };
  dark: boolean;
  onClose: () => void;
}

function BrandIcon({ brand }: { brand: 'whatsapp' | 'facebook' | 'linkedin' | 'email' }) {
  if (brand === 'facebook') {
    return <span className="text-[18px] font-black leading-none">f</span>;
  }
  if (brand === 'linkedin') {
    return <span className="text-[15px] font-black leading-none">in</span>;
  }
  if (brand === 'email') {
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M20.5 3.5A11.86 11.86 0 0 0 12.05 0C5.5 0 .17 5.33.17 11.88c0 2.1.55 4.15 1.6 5.96L.06 24l6.3-1.65a11.85 11.85 0 0 0 5.68 1.44h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.18-1.24-6.16-3.43-8.41ZM12.05 21.8h-.01a9.88 9.88 0 0 1-5.04-1.38l-.36-.21-3.74.98 1-3.64-.23-.37a9.87 9.87 0 0 1-1.51-5.3C2.16 6.43 6.59 2 12.05 2c2.65 0 5.14 1.03 7.01 2.9a9.84 9.84 0 0 1 2.9 7.01c0 5.46-4.44 9.89-9.91 9.89Zm5.43-7.4c-.3-.15-1.78-.88-2.05-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.18.2-.35.23-.65.08-1.78-.89-2.95-1.59-4.13-3.6-.31-.53.31-.49.89-1.63.1-.2.05-.38-.03-.53-.08-.15-.68-1.64-.93-2.25-.25-.6-.5-.52-.68-.53h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.49 1.72.63.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35Z" />
    </svg>
  );
}

export default function ShareModal({ postId, post, dark, onClose }: ShareModalProps) {
  const { network, fetchNetwork, hasData, loading: networkLoading } = useNetwork();
  const friends = network.friends;
  const loading = networkLoading && !hasData;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [sharing, setSharing] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const postUrl = `https://dojoclass.space/community/post/${postId}`;
  const shareDescription = post?.content?.trim()
    ? post.content.trim().slice(0, 240)
    : 'Check out this community post on DojoClass.';
  const shareTitle = post?.author?.name
    ? `${post.author.name} on DojoClass`
    : 'DojoClass community post';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleWhatsApp = () => {
    const text = `${shareTitle}\n\n${shareDescription}\n\n${postUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      await handleCopyLink();
      return;
    }
    try {
      await navigator.share({
        title: shareTitle,
        text: shareDescription,
        url: postUrl,
      });
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') {
        toast.error('Could not open the share menu');
      }
    }
  };

  const openSocialShare = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=640,height=600');
  };

  useEffect(() => {
    if (!hasData) {
      fetchNetwork();
    }
  }, [hasData, fetchNetwork]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleShare = async () => {
    if (selected.size === 0 || sharing) return;
    setSharing(true);
    try {
      await API.post(`/community/posts/${postId}/share`, { receiverIds: Array.from(selected) });
      setDone(true);
      setTimeout(onClose, 1200);
    } catch {
      setSharing(false);
    }
  };

  const filtered = friends.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  const getInitials = (name: string) => name.charAt(0).toUpperCase();
  const colors = [
    'from-indigo-400 to-purple-500',
    'from-pink-400 to-rose-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-blue-400 to-cyan-500',
  ];

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className={`relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
          dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
        }`}
        style={{ maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
          <h2 className={`text-[15px] font-semibold ${dark ? 'text-white' : 'text-zinc-900'}`}>
            Share post
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'}`}
          >
          </button>
        </div>

        {/* ── Social sharing ───────────────────────────────────── */}
        <div className={`px-4 py-3 border-b ${dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
          {post && (
            <div className={`mb-3 overflow-hidden rounded-xl border ${dark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'}`}>
              {post.media?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.media[0].type === 'video' ? (post.media[0].thumbnailUrl || post.media[0].url) : post.media[0].url}
                  alt="Shared post preview"
                  className="h-24 w-full object-cover"
                />
              )}
              <div className="p-2.5">
                <p className={`text-[11px] font-semibold ${dark ? 'text-white' : 'text-zinc-900'}`}>{post.author.name}</p>
                <p className={`mt-0.5 line-clamp-2 text-[11px] leading-snug ${dark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  {post.content || 'Shared a post on DojoClass'}
                </p>
                {post.community?.name && (
                  <p className={`mt-1 text-[9px] font-medium ${dark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                    #{post.community.name}
                  </p>
                )}
              </div>
            </div>
          )}
          {/* Link preview bar */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] mb-2.5 truncate border ${
            dark ? 'bg-zinc-800/60 border-zinc-700 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500'
          }`}>
            <Link2 size={12} className="shrink-0 opacity-60" />
            <span className="truncate">{postUrl}</span>
            <button
              onClick={handleCopyLink}
              className={`ml-auto shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                copied ? 'bg-emerald-500 text-white' : dark ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600' : 'bg-white text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button onClick={handleNativeShare} aria-label="Share using device" title="Share" className={`flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-[0.92] ${dark ? 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
              <Share2 size={22} />
            </button>
            <button onClick={handleWhatsApp} aria-label="Share on WhatsApp" title="WhatsApp" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white transition-all hover:bg-[#20c45b] active:scale-[0.92]">
              <BrandIcon brand="whatsapp"  />
            </button>
            <button onClick={() => openSocialShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`)} aria-label="Share on Facebook" title="Facebook" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-white transition-all hover:bg-[#166fe5] active:scale-[0.92]">
              <BrandIcon brand="facebook" />
            </button>
            <button onClick={() => openSocialShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`)} aria-label="Share on LinkedIn" title="LinkedIn" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A66C2] text-white transition-all hover:bg-[#0959a8] active:scale-[0.92]">
              <BrandIcon brand="linkedin" />
            </button>
            <button onClick={() => openSocialShare(`mailto:?subject=${encodeURIComponent('A DojoClass community post')}&body=${encodeURIComponent(postUrl)}`)} aria-label="Share by email" title="Email" className={`flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-[0.92] ${dark ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}>
              <BrandIcon brand="email" />
            </button>
          </div>
        </div>

        {/* ── Share with friends (in-app) ──────────────────────── */}
        {/* Search */}
        <div className={`px-4 py-2.5 border-b ${dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] ${dark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
            <Search size={13} className="shrink-0 opacity-60" />
            <input
              type="text"
              placeholder="Search friends…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent outline-none flex-1 placeholder:opacity-50"
            />
          </div>
        </div>

        {/* Friend list */}
        <div className="min-h-[180px] flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className={`animate-spin ${dark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            </div>
          ) : filtered.length === 0 ? (
            <p className={`text-center text-[13px] py-8 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {friends.length === 0 ? 'No friends yet' : 'No results'}
            </p>
          ) : (
            filtered.map((friend) => {
              const isSelected = selected.has(friend.id);
              const colorIdx = friend.name.charCodeAt(0) % colors.length;
              return (
                <button
                  key={friend.id}
                  onClick={() => toggleSelect(friend.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                    isSelected
                      ? dark ? 'bg-indigo-500/10' : 'bg-indigo-50'
                      : dark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                  }`}
                >
                  {/* Avatar */}
                  {friend.avatarUrl ? (
                    <img
                      src={friend.avatarUrl}
                      alt={friend.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white bg-gradient-to-br ${colors[colorIdx]} shrink-0`}>
                      {getInitials(friend.name)}
                    </div>
                  )}

                  <span className={`flex-1 text-[14px] font-medium ${dark ? 'text-zinc-100' : 'text-zinc-800'}`}>
                    {friend.name}
                  </span>

                  {/* Checkmark */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500'
                      : dark ? 'border-zinc-600' : 'border-zinc-300'
                  }`}>
                    {isSelected && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t ${dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
          <button
            onClick={handleShare}
            disabled={selected.size === 0 || sharing || done}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
              done
                ? 'bg-emerald-500 text-white'
                : selected.size === 0
                ? dark ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98]'
            }`}
          >
            {done ? (
              <>
                <CheckCircle2 size={15} />
                Shared!
              </>
            ) : sharing ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Sharing…
              </>
            ) : (
              <>
                <Send size={14} />
                {selected.size > 0 ? `Share with ${selected.size} friend${selected.size > 1 ? 's' : ''}` : 'Select friends to share'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

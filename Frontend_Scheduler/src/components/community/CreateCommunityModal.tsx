'use client';

import React, { useState, useRef } from 'react';
import { X, Lock, Eye, Mail, Loader2, Camera, Check } from 'lucide-react';
import { useCommunityGroups, CommunityVisibility } from '@/context/CommunityGroupContext';
import { useRouter } from 'next/navigation';
import API from '@/lib/axios';

interface CreateCommunityModalProps {
  dark: boolean;
  onClose: () => void;
}

const VISIBILITY_OPTIONS: { value: CommunityVisibility; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'public',
    label: 'Public',
    desc: 'Anyone can view and join',
    icon: <Eye size={16} />,
  },
  {
    value: 'private',
    label: 'Private',
    desc: 'Anyone can view, only members can post',
    icon: <Lock size={16} />,
  },
  {
    value: 'invite_only',
    label: 'Invite Only',
    desc: 'Only invited users can join and see posts',
    icon: <Mail size={16} />,
  },
];

export default function CreateCommunityModal({ dark, onClose }: CreateCommunityModalProps) {
  const router = useRouter();
  const { createCommunity } = useCommunityGroups();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<CommunityVisibility>('public');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avatar & Banner states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerPositionY, setBannerPositionY] = useState(50);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (!slugManual) {
      setSlug(slugify(e.target.value));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManual(true);
    setSlug(slugify(e.target.value));
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setAvatarFile(files[0]);
      setAvatarPreview(URL.createObjectURL(files[0]));
    }
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setBannerFile(files[0]);
      setBannerPreview(URL.createObjectURL(files[0]));
    }
  };

  const uploadSingleFile = async (file: File): Promise<string> => {
    const { data } = await API.post('/community/media/sign', {
      fileName: file.name,
      mimeType: file.type,
    });
    const { uploadUrl, publicUrl } = data as { uploadUrl: string; publicUrl: string };

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed: ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Community name is required'); return; }
    if (!slug) { setError('Slug is required'); return; }
    if (slug.length < 3) { setError('Slug must be at least 3 characters'); return; }

    setLoading(true);
    try {
      let finalAvatarUrl: string | undefined = undefined;
      let finalBannerUrl: string | undefined = undefined;

      if (avatarFile) {
        finalAvatarUrl = await uploadSingleFile(avatarFile);
      }
      if (bannerFile) {
        const rawUrl = await uploadSingleFile(bannerFile);
        finalBannerUrl = `${rawUrl}?pos=${bannerPositionY}`;
      }

      const community = await createCommunity({
        name: name.trim(),
        slug,
        description: description.trim() || undefined,
        visibility,
        avatarUrl: finalAvatarUrl,
        bannerUrl: finalBannerUrl,
      });
      onClose();
      router.push(`/community/groups/${community.slug}`);
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.error || 'Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  const selectedVisibility = VISIBILITY_OPTIONS.find((v) => v.value === visibility)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-4xl h-[90vh] md:h-[620px] rounded-xl border shadow-2xl flex flex-col md:flex-row overflow-hidden transition-all duration-300 ${
          dark ? 'bg-zinc-950 border-zinc-800 text-white shadow-indigo-950/10' : 'bg-white border-zinc-200 text-zinc-900 shadow-zinc-200/50'
        }`}
      >
        {/* Left Side: Live Preview Panel */}
        <div
          className={`hidden md:flex flex-col justify-center p-8 border-b md:border-b-0 md:border-r w-full md:w-[380px] shrink-0 transition-colors ${
            dark ? 'bg-zinc-900/40 border-zinc-850' : 'bg-zinc-50/60 border-zinc-150'
          }`}
        >
          <div className="mb-6 text-center">
            <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full ${
              dark ? 'bg-zinc-900 text-zinc-450 border border-zinc-800' : 'bg-zinc-250/50 text-zinc-500 border border-zinc-300/30'
            }`}>
              Card Preview
            </span>
          </div>

          {/* Preview Card Mockup */}
          <div
            className={`w-full max-w-[310px] mx-auto rounded-xl border overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl ${
              dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            {/* Banner & Avatar Wrapper */}
            <div className="relative">
              <div
                className={`h-24 overflow-hidden relative group/banner ${
                  dark ? 'bg-gradient-to-br from-indigo-950 via-zinc-900 to-zinc-950' : 'bg-gradient-to-br from-indigo-100 via-indigo-50 to-purple-50'
                }`}
              >
                {/* Visual placeholder or real image */}
                {bannerPreview ? (
                  <img
                    src={bannerPreview}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `center ${bannerPositionY}%` }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-650 to-pink-500 opacity-80" />
                )}

                {/* Change banner hover overlay */}
                <div
                  onClick={() => bannerInputRef.current?.click()}
                  className="absolute inset-0 bg-black/0 hover:bg-black/40 cursor-pointer flex items-center justify-center transition-all duration-200"
                >
                  <div className="flex flex-col items-center gap-1 opacity-0 hover:opacity-100 transition-opacity duration-200 bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10">
                    <Camera size={14} className="text-white" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change Cover</span>
                  </div>
                </div>
              </div>

              {/* Avatar position on card */}
              <div
                className={`absolute -bottom-6 left-4 w-12 h-12 rounded-xl border-2 flex items-center justify-center overflow-hidden shrink-0 z-10 cursor-pointer group/avatar shadow-md transition-all duration-200 ${
                  dark ? 'border-zinc-900 bg-zinc-800' : 'border-white bg-zinc-100'
                }`}
                onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-full h-full object-contain bg-black/5 dark:bg-white/5" />
                ) : (
                  <span className={`text-[15px] font-bold ${dark ? 'text-indigo-400' : 'text-indigo-650'}`}>
                    {name ? name.charAt(0).toUpperCase() : '?'}
                  </span>
                )}

                <div className="absolute inset-0 bg-black/0 hover:bg-black/50 flex items-center justify-center transition-all duration-200">
                  <Camera size={12} className="text-white opacity-0 hover:opacity-100 transition-opacity duration-200" />
                </div>
              </div>
            </div>

            {/* Content Body of Preview Card */}
            <div className="p-4 pt-8">
              {/* Name & Slug */}
              <div className="min-w-0 mb-2">
                <h3 className={`text-[14px] font-bold truncate leading-tight ${dark ? 'text-white' : 'text-zinc-900'}`}>
                  {name.trim() || 'Your Community Name'}
                </h3>
                <p className={`text-[11px] font-medium leading-none mt-1 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  c/{slug || 'your-slug'}
                </p>
              </div>

              {/* Description */}
              <p className={`text-[11.5px] leading-relaxed line-clamp-2 h-8 ${dark ? 'text-zinc-450' : 'text-zinc-500'}`}>
                {description.trim() || 'This is a description preview for your community...'}
              </p>

              {/* Spacer / divider */}
              <div className={`border-t my-3 ${dark ? 'border-zinc-800/65' : 'border-zinc-100'}`} />

              {/* Bottom Info Row */}
              <div className="flex items-center justify-between text-[11px]">
                {/* Visibility Badge */}
                <span className={`inline-flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded-full ${
                  dark ? 'bg-zinc-800/80 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {selectedVisibility.icon}
                  {selectedVisibility.label}
                </span>

                <span className={`font-semibold ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  1 member
                </span>
              </div>
            </div>
          </div>

          {/* Banner adjustment slider below preview */}
          {bannerPreview && (
            <div className="w-full max-w-[310px] mx-auto mt-6 space-y-1.5 bg-zinc-900/20 dark:bg-zinc-950/20 p-3 rounded-lg border border-dashed border-zinc-700/30">
              <div className="flex justify-between items-center text-[10.5px] font-bold">
                <span className={dark ? 'text-zinc-450' : 'text-zinc-500'}>Vertical Crop Adjustment</span>
                <span className="font-bold text-indigo-500">{bannerPositionY}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={bannerPositionY}
                onChange={(e) => setBannerPositionY(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Right Side: Form Configuration */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className={`flex items-center justify-between p-5 border-b shrink-0 ${dark ? 'border-zinc-850' : 'border-zinc-100'}`}>
            <div>
              <h2 className="text-[17px] font-bold tracking-tight">Create a Community</h2>
              <p className={`text-[11.5px] mt-0.5 leading-none ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Design your community and customize its settings.
              </p>
            </div>
            <button
              onClick={onClose}
              type="button"
              className={`p-1.5 rounded-lg transition-colors ${
                dark ? 'text-zinc-450 hover:bg-zinc-900 hover:text-white' : 'text-zinc-500 hover:bg-zinc-100'
              }`}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5">
            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-[12.5px] text-red-400 animate-in fade-in slide-in-from-top-1 duration-205">
                {error}
              </div>
            )}

            {/* Helper text on mobile to let them know they can click top to upload */}
            <div className="block md:hidden bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 rounded-lg p-3 text-[12px] text-indigo-400">
              <span className="font-bold">Pro-tip:</span> You can tap the banner and avatar elements in the community card preview to upload custom community artwork.
            </div>

            {/* Hidden File Inputs */}
            <input type="file" ref={bannerInputRef} accept="image/*" className="hidden" onChange={handleBannerSelect} />
            <input type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={handleAvatarSelect} />

            {/* Community Name Field */}
            <div className="space-y-1.5">
              <label className={`block text-[12.5px] font-semibold ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Community Name <span className="text-red-550">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                maxLength={80}
                placeholder="e.g. Karate Masters"
                className={`w-full rounded-lg border px-3.5 py-3 text-[14px] outline-none transition-all duration-205 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                  dark
                    ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-650'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                }`}
              />
            </div>

            {/* Slug URL Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={`block text-[12.5px] font-semibold ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Slug (URL) <span className="text-red-550">*</span>
                </label>
                {slug.length >= 3 && (
                  <span className="text-[11px] text-emerald-500 flex items-center gap-1 font-semibold">
                    <Check size={12} /> URL is available
                  </span>
                )}
              </div>
              <div className={`flex items-center rounded-lg border overflow-hidden transition-all duration-205 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 ${
                dark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <span className={`px-3 py-3 text-[13px] font-bold select-none border-r ${dark ? 'text-zinc-550 border-zinc-800' : 'text-zinc-400 border-zinc-200'}`}>
                  dojo.com/c/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={handleSlugChange}
                  maxLength={50}
                  placeholder="karate-masters"
                  className={`flex-1 py-3 px-3.5 text-[14px] outline-none bg-transparent ${
                    dark ? 'text-white placeholder:text-zinc-650' : 'text-zinc-900 placeholder:text-zinc-400'
                  }`}
                />
              </div>
              <p className={`text-[11px] ${dark ? 'text-zinc-500' : 'text-zinc-450'}`}>
                Lowercase letters, numbers, and hyphens only. This cannot be modified later.
              </p>
            </div>

            {/* Description Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className={`block text-[12.5px] font-semibold ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Description <span className="font-normal text-[11.5px] opacity-60">(optional)</span>
                </label>
                <span className={`text-[11px] font-semibold ${dark ? 'text-zinc-550' : 'text-zinc-400'}`}>
                  {description.length}/300
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 300))}
                rows={3}
                placeholder="What is this community about?"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-[14px] outline-none resize-none transition-all duration-205 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                  dark
                    ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-650'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                }`}
              />
            </div>

            {/* Visibility Stack (Everything Visible) */}
            <div className="space-y-2">
              <label className={`block text-[12.5px] font-semibold ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Visibility Settings
              </label>
              <div className="space-y-2">
                {VISIBILITY_OPTIONS.map((opt) => {
                  const isSelected = visibility === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVisibility(opt.value)}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 flex items-start gap-3 ${
                        isSelected
                          ? dark
                            ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-[0_0_12px_rgba(99,102,241,0.1)]'
                            : 'border-indigo-600 bg-indigo-50/50 text-indigo-950 shadow-[0_2px_8px_rgba(99,102,241,0.06)]'
                          : dark
                            ? 'border-zinc-800 bg-zinc-900/30 text-zinc-450 hover:border-zinc-700 hover:bg-zinc-900/50'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50/50'
                      }`}
                    >
                      <span className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
                        isSelected
                          ? dark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
                          : dark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'
                      }`}>
                        {opt.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13px] font-bold ${isSelected ? dark ? 'text-indigo-200' : 'text-indigo-900' : dark ? 'text-zinc-300' : 'text-zinc-800'}`}>
                          {opt.label}
                        </div>
                        <div className={`text-[11px] leading-snug mt-0.5 ${isSelected ? dark ? 'text-indigo-300/70' : 'text-indigo-600/70' : dark ? 'text-zinc-550' : 'text-zinc-450'}`}>
                          {opt.desc}
                        </div>
                      </div>
                      {isSelected && (
                        <div className={`w-3.5 h-3.5 rounded-full border-4 border-indigo-500 shrink-0 self-center ${dark ? 'bg-zinc-950' : 'bg-white'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className={`p-4 border-t flex items-center justify-end gap-3 shrink-0 ${dark ? 'border-zinc-850 bg-zinc-950/20' : 'border-zinc-100 bg-zinc-50/20'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-[13.5px] font-bold transition-all ${
                dark ? 'text-zinc-450 hover:bg-zinc-900 hover:text-white' : 'text-zinc-650 hover:bg-zinc-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !slug}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13.5px] font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Creating…' : 'Create Community'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { useDarkMode } from '@/context/DarkModeContext';
import { useCommunityGroups, CommunityGroup } from '@/context/CommunityGroupContext';
import API from '@/lib/axios';
import {
  ArrowLeft, Settings, Users, ShieldAlert, Trash2,
  Upload, Camera, Check, Shield, User, X, Loader2
} from 'lucide-react';

interface Member {
  userId: string;
  role: 'creator' | 'moderator' | 'member';
  joinedAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export default function CommunitySettingsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, userId } = useAuth() as any;
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;
  const {
    activeCommunity,
    activeLoading,
    activeError,
    fetchCommunityBySlug,
    updateCommunityLocal,
    removeCommunityLocal
  } = useCommunityGroups();

  const [hasInitialized, setHasInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'invite_only'>('public');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerPositionY, setBannerPositionY] = useState(50);
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'danger'>('general');

  // Members list states
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersCursor, setMembersCursor] = useState<string | null>(null);

  // Deletion confirm input
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingCommunity, setDeletingCommunity] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const fetchMembers = useCallback(async (cursor?: string) => {
    setMembersLoading(true);
    try {
      const { data } = await API.get(`/groups/${slug}/members`, { params: cursor ? { cursor } : {} });
      if (cursor) {
        setMembers((prev) => {
          const ids = new Set(prev.map((m) => m.userId));
          return [...prev, ...data.members.filter((m: Member) => !ids.has(m.userId))];
        });
      } else {
        setMembers(data.members);
      }
      setMembersCursor(data.nextCursor);
    } catch {}
    finally { setMembersLoading(false); }
  }, [slug]);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        const isSilent = !!(activeCommunity && activeCommunity.slug === slug);
        if (!isSilent) {
          setHasInitialized(false);
        }
        fetchCommunityBySlug(slug, isSilent);
      }
    }
  }, [authLoading, isAuthenticated, slug, fetchCommunityBySlug, router]);

  useEffect(() => {
    if (activeCommunity && activeCommunity.slug === slug && !hasInitialized) {
      setName(activeCommunity.name);
      setDescription(activeCommunity.description || '');
      setVisibility(activeCommunity.visibility);
      setAvatarPreview(activeCommunity.avatarUrl || null);
      setBannerPreview(activeCommunity.bannerUrl || null);
      if (activeCommunity.bannerUrl) {
        const match = activeCommunity.bannerUrl.match(/[?&]pos=(\d+)/);
        setBannerPositionY(match ? parseInt(match[1], 10) : 50);
      } else {
        setBannerPositionY(50);
      }
      setHasInitialized(true);
    }
  }, [activeCommunity, slug, hasInitialized]);

  useEffect(() => {
    if (activeCommunity && activeCommunity.slug === slug) {
      const userRole = activeCommunity.myRole;
      if (userRole !== 'creator' && userRole !== 'moderator') {
        setError('Access denied. You must be an administrator or moderator to edit settings.');
      } else {
        setError(null);
      }
    }
  }, [activeCommunity, slug]);

  const community = activeCommunity && activeCommunity.slug === slug ? activeCommunity : null;
  const isDataLoaded = activeCommunity && activeCommunity.slug === slug && hasInitialized;
  const loading = authLoading || (activeLoading && !isDataLoaded) || (!isDataLoaded && !activeError && !error);
  const finalError = error || activeError;

  useEffect(() => {
    if (community && activeTab === 'members' && members.length === 0) {
      fetchMembers();
    }
  }, [community, activeTab, fetchMembers, members.length]);

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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      let finalAvatarUrl = avatarPreview;
      let finalBannerUrl = bannerPreview;

      if (avatarFile) {
        finalAvatarUrl = await uploadSingleFile(avatarFile);
      }
      if (bannerFile) {
        const rawUrl = await uploadSingleFile(bannerFile);
        finalBannerUrl = `${rawUrl}?pos=${bannerPositionY}`;
      } else if (bannerPreview) {
        const cleanUrl = bannerPreview.split('?')[0];
        finalBannerUrl = `${cleanUrl}?pos=${bannerPositionY}`;
      } else {
        finalBannerUrl = null;
      }

      const { data } = await API.patch(`/groups/${slug}`, {
        name: name.trim(),
        description: description.trim() || null,
        visibility,
        avatarUrl: finalAvatarUrl,
        bannerUrl: finalBannerUrl,
      });

      updateCommunityLocal(slug, data.community);
      setSaveSuccess(true);
      setAvatarFile(null);
      setBannerFile(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (memberId: string, currentRole: string) => {
    if (!community || community.myRole !== 'creator') return;
    const nextRole = currentRole === 'moderator' ? 'member' : 'moderator';

    try {
      await API.patch(`/groups/${slug}/members/${memberId}/role`, { role: nextRole });
      setMembers((prev) =>
        prev.map((m) => (m.userId === memberId ? { ...m, role: nextRole } : m))
      );
    } catch {}
  };

  const handleKickMember = async (memberId: string) => {
    if (!community) return;
    try {
      await API.delete(`/groups/${slug}/members/${memberId}`);
      setMembers((prev) => prev.filter((m) => m.userId !== memberId));
    } catch {}
  };

  const handleDeleteCommunity = async () => {
    if (!community || community.myRole !== 'creator' || deleteConfirmText !== community.slug) return;
    setDeletingCommunity(true);
    try {
      await API.delete(`/groups/${slug}`);
      removeCommunityLocal(slug);
      router.push('/community/groups');
    } catch {
      setDeletingCommunity(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen ${dark ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f5]'} flex items-center justify-center`}>
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (finalError && !community) {
    return (
      <div className={`min-h-screen p-8 flex flex-col items-center justify-center gap-4 ${dark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-zinc-900'}`}>
        <ShieldAlert size={48} className="text-red-500" />
        <p className="font-semibold text-center max-w-md leading-relaxed">{finalError}</p>
        <button onClick={() => router.back()} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-medium ${dark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-900' : 'border-zinc-200 text-zinc-600 hover:bg-white'}`}>
          <ArrowLeft size={15} /> Go back
        </button>
      </div>
    );
  }

  if (!community) return null;

  const isCreator = community.myRole === 'creator';

  return (
    <div className={`min-h-screen pt-[50px] md:pt-0 pb-16 transition-colors duration-300 ${dark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-zinc-900'}`}>
      <div className="max-w-[760px] mx-auto px-4 pt-6">
        
        {/* Back and Page Title */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className={`p-2 rounded-xl transition-all ${dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-800 hover:bg-white border'}`}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-[20px] font-bold tracking-tight">Community Settings</h1>
            <p className={`text-[12.5px] ${dark ? 'text-zinc-550' : 'text-zinc-500'}`}>Manage c/{community.slug}</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className={`flex rounded-xl p-1 mb-6 border ${dark ? 'bg-zinc-950/40 border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-semibold rounded-lg transition-all ${
              activeTab === 'general'
                ? dark ? 'bg-zinc-850 text-white' : 'bg-zinc-100 text-zinc-800'
                : dark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Settings size={14} />
            <span>General</span>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-semibold rounded-lg transition-all ${
              activeTab === 'members'
                ? dark ? 'bg-zinc-850 text-white' : 'bg-zinc-100 text-zinc-800'
                : dark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Users size={14} />
            <span>Members</span>
          </button>
          {isCreator && (
            <button
              onClick={() => setActiveTab('danger')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-semibold rounded-lg transition-all ${
                activeTab === 'danger'
                  ? 'bg-red-500/10 text-red-400'
                  : dark ? 'text-zinc-400 hover:text-red-400' : 'text-zinc-500 hover:text-red-500'
              }`}
            >
              <Trash2 size={14} />
              <span>Danger Zone</span>
            </button>
          )}
        </div>

        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveSettings} className={`rounded-2xl border p-6 space-y-6 ${dark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            
            {/* Custom Banner & Avatar editor */}
            <div>
              <label className={`block text-[12.5px] font-semibold mb-2 ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Community Images
              </label>
              
              <div className="relative h-32 w-full rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center group">
                {bannerPreview ? (
                  <img
                    src={bannerPreview}
                    alt="Community banner"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: `center ${bannerPositionY}%` }}
                  />
                ) : (
                  <span className={`text-[12px] font-semibold ${dark ? 'text-zinc-650' : 'text-zinc-400'}`}>Add cover banner</span>
                )}
                <div
                  className="absolute inset-0 bg-black/10 group-hover:bg-black/35 transition-all cursor-pointer flex items-center justify-center"
                  onClick={() => bannerInputRef.current?.click()}
                >
                  <Upload size={18} className="text-white opacity-0 group-hover:opacity-100 transition-all drop-shadow-md" />
                </div>

                {/* Overlapping Avatar circular picker */}
                <div
                  className="absolute bottom-2 left-4 w-16 h-16 rounded-xl border-2 overflow-hidden flex items-center justify-center shrink-0 shadow-md group/avatar cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); }}
                  style={{ borderColor: dark ? '#09090b' : '#ffffff', backgroundColor: dark ? '#18181b' : '#f4f4f5' }}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Community avatar" className="w-full h-full object-contain bg-black/5 dark:bg-white/5" />
                  ) : (
                    <span className={`text-xl font-bold ${dark ? 'text-zinc-450' : 'text-zinc-400'}`}>
                      {name ? name.charAt(0).toUpperCase() : '?'}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover/avatar:bg-black/40 flex items-center justify-center transition-all">
                    <Camera size={16} className="text-white opacity-0 group-hover/avatar:opacity-100 transition-all" />
                  </div>
                </div>
              </div>

              <input type="file" ref={bannerInputRef} accept="image/*" className="hidden" onChange={handleBannerSelect} />
              <input type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={handleAvatarSelect} />

              {bannerPreview && (
                <div className="mt-3.5 space-y-1.5 max-w-sm">
                  <div className="flex justify-between items-center text-[11.5px] font-medium">
                    <span className={dark ? 'text-zinc-400' : 'text-zinc-550'}>Vertical Banner Position</span>
                    <span className="font-bold text-indigo-500">{bannerPositionY}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bannerPositionY}
                    onChange={(e) => setBannerPositionY(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-200 dark:bg-zinc-855 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label className={`block text-[12.5px] font-semibold mb-1.5 ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Community Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-[14px] outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                  dark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                }`}
              />
            </div>

            {/* Description */}
            <div>
              <label className={`block text-[12.5px] font-semibold mb-1.5 ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={300}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-[14px] outline-none resize-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                  dark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                }`}
              />
            </div>

            {/* Visibility */}
            <div>
              <label className={`block text-[12.5px] font-semibold mb-1.5 ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Visibility
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['public', 'private', 'invite_only'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisibility(v)}
                    className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                      visibility === v
                        ? dark ? 'bg-indigo-950/20 border-indigo-500 text-indigo-400' : 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : dark ? 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300'
                    }`}
                  >
                    <span className="text-[13px] font-semibold capitalize">{v.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-green-500">
                    <Check size={14} /> Saved successfully
                  </span>
                )}
                {error && <span className="text-[12.5px] font-semibold text-red-500">{error}</span>}
              </div>
              
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13.5px] font-semibold transition-all active:scale-95 disabled:opacity-50"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Manage Members Tab */}
        {activeTab === 'members' && (
          <div className={`rounded-2xl border p-5 ${dark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <h3 className="text-[15px] font-bold mb-4">Manage Members ({community.memberCount})</h3>
            
            <div className="divide-y divide-zinc-100 dark:divide-zinc-850">
              {members.map((member) => {
                const isSelf = member.userId === userId;
                const canModerateThisMember = isCreator && member.role !== 'creator';
                const canKickThisMember = (isCreator && member.role !== 'creator') || 
                                          (community.myRole === 'moderator' && member.role === 'member');
                
                return (
                  <div key={member.userId} className="flex items-center justify-between py-3.5 gap-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 flex items-center justify-center font-bold">
                        {member.user.avatarUrl ? (
                          <img src={member.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          member.user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[14px] font-semibold">{member.user.name}</span>
                          {member.role === 'creator' && (
                            <span className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${dark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                              Creator
                            </span>
                          )}
                          {member.role === 'moderator' && (
                            <span className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${dark ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                              Mod
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Promote/Demote Toggle (Creator only) */}
                      {canModerateThisMember && (
                        <button
                          onClick={() => handleRoleChange(member.userId, member.role)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900`}
                        >
                          <Shield size={12} />
                          <span>{member.role === 'moderator' ? 'Demote to Member' : 'Promote to Moderator'}</span>
                        </button>
                      )}
                      
                      {/* Kick Button (Creator or Moderator depending on role hierarchy) */}
                      {canKickThisMember && (
                        <button
                          onClick={() => handleKickMember(member.userId)}
                          className={`p-2 rounded-xl text-red-500 hover:bg-red-500/5 transition-all`}
                          title="Remove from community"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {membersCursor && (
                <div className="pt-4 flex justify-center">
                  <button
                    onClick={() => fetchMembers(membersCursor)}
                    disabled={membersLoading}
                    className={`px-4 py-2 rounded-xl border text-[12.5px] font-medium transition-all ${
                      dark ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-900' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {membersLoading ? 'Loading…' : 'Load more members'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && isCreator && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-6">
            <div>
              <h3 className="text-[16px] font-bold text-red-400 flex items-center gap-2">
                <Trash2 size={18} /> Delete Community
              </h3>
              <p className={`text-[12.5px] leading-relaxed mt-2 ${dark ? 'text-red-400/80' : 'text-red-600/80'}`}>
                Once you delete a community, all of its posts, files, members, settings, and invite list will be **permanently deleted**. This action is irreversible.
              </p>
            </div>

            <div className="space-y-3">
              <p className={`text-[13px] font-semibold ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Please type the community slug <span className="font-mono text-red-400 select-all">{community.slug}</span> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={community.slug}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-[14px] font-mono outline-none transition-all border-red-500/30 focus:border-red-500 ${
                  dark ? 'bg-zinc-900/50 text-white' : 'bg-white text-zinc-900'
                }`}
              />
            </div>

            <button
              onClick={handleDeleteCommunity}
              disabled={deletingCommunity || deleteConfirmText !== community.slug}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-[13.5px] font-bold transition-all active:scale-95 shadow-md"
            >
              {deletingCommunity && <Loader2 size={15} className="animate-spin" />}
              <span>{deletingCommunity ? 'Deleting…' : 'I understand, delete this community'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

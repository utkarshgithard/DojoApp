"use client";

import { useAuth } from '@/context/authContext';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useRef, useCallback } from "react";
import API from "@/lib/axios";
import { useDarkMode } from '@/context/DarkModeContext';
import { User, Palette, Copy, Check, Settings, Mail, BookOpen, Camera, Bell, BellOff, BellRing, X } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';

const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL('image/jpeg', 0.9);
};
import { toast } from 'sonner';
import { auth } from '@/lib/firebase';
import {
  isPushSupported,
  isPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  getNotificationPermission,
} from '@/lib/webPush';

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, setUserName, userDetails, profileLoading, setUserDetails, token } = useAuth() as any;
  const [details, setDetails] = useState<any>({});
  const { darkMode, toggleDarkMode } = useDarkMode() as any;
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // ── Notification state ───────────────────────────────────────────────────
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushPermission, setPushPermission] = useState<string>('default');
  const [pushLoading, setPushLoading] = useState(false);

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    bio: '',
    avatarUrl: '',
  });

  // Populate local state from auth context's userDetails (already fetched at app startup)
  useEffect(() => {
    if (userDetails) {
      setDetails(userDetails);
      setUserData({
        name: userDetails.name || '',
        email: userDetails.email || '',
        bio: userDetails.bio || '',
        avatarUrl: userDetails.avatarUrl || auth.currentUser?.photoURL || '',
      });
    }
  }, [userDetails]);

  // ── Detect push support & current subscription state ─────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPushSupported(isPushSupported());
    setPushPermission(getNotificationPermission());
    isPushSubscribed().then(setPushSubscribed);
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        return toast.error('Please upload an image file');
      }
      if (file.size > 2.5 * 1024 * 1024) {
        return toast.error('Image size must be less than 2.5MB');
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSubmit = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
      setUserData(prev => ({ ...prev, avatarUrl: croppedImage }));
      setCropModalOpen(false);
      setImageToCrop(null);
    } catch (e) {
      console.error(e);
      toast.error('Failed to crop image');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await API.put('/auth/profile', {
        name: userData.name,
        bio: userData.bio,
        avatarUrl: userData.avatarUrl,
      });
      setDetails(res.data.user);
      setUserDetails(res.data.user);
      if (res.data.user?.name) {
        setUserName(res.data.user.name);
      }
      toast.success('Profile settings updated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = () => {
    if (details.friendCode) {
      navigator.clipboard.writeText(details.friendCode);
      setCopied(true);
      toast.success('Friend Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const dark = darkMode;
  const border = dark ? 'border-gray-800' : 'border-gray-200';
  const muted = dark ? 'text-gray-400' : 'text-gray-500';
  const cardClass = `border rounded-xl p-5 ${border} ${dark ? 'bg-black' : 'bg-white'}`;

  const inputClass = `w-full px-3.5 py-2 text-sm rounded-lg border outline-none transition-colors mb-4
    ${dark
      ? 'bg-black border-gray-800 text-white placeholder-gray-700 focus:border-gray-600'
      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'
    }`;

  const labelClass = `block text-[11px] uppercase tracking-wider font-medium mb-1.5 ${muted}`;

  const primaryBtn = `px-4 py-2.5 rounded-lg text-[13px] font-medium transition-opacity hover:opacity-80 active:scale-95
    ${dark ? 'bg-white text-black' : 'bg-black text-white'}
    disabled:opacity-40`;

  const secondaryBtn = `px-3.5 py-2.5 rounded-lg text-[13px] font-medium border transition-colors flex items-center justify-center gap-1.5
    ${dark
      ? 'border-gray-800 text-gray-200 hover:bg-gray-900 active:bg-gray-950'
      : 'border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100'
    } disabled:opacity-40`;

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: <User size={14} /> },
    { id: 'appearance', label: 'Theme Styling', icon: <Palette size={14} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
  ];

  const handleTogglePush = async () => {
    if (!token) { toast.error('You must be logged in.'); return; }
    setPushLoading(true);
    try {
      if (pushSubscribed) {
        const ok = await unsubscribeFromPush(token);
        if (ok) {
          setPushSubscribed(false);
          setPushPermission(getNotificationPermission());
          toast.success('Push notifications disabled.');
        } else {
          toast.error('Could not disable notifications. Please try again.');
        }
      } else {
        const ok = await subscribeToPush(token);
        if (ok) {
          setPushSubscribed(true);
          setPushPermission(getNotificationPermission());
          toast.success('🔔 Push notifications enabled!');
        } else if (getNotificationPermission() === 'denied') {
          toast.error('Permission blocked. Please allow notifications in your browser settings.');
        } else {
          toast.error('Could not enable notifications. Please try again.');
        }
      }
    } finally {
      setPushLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className={`min-h-screen flex justify-center items-center transition-colors duration-300 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
        <span className="inline-block w-6 h-6 rounded-full border-[2px] border-current border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 pt-[96px] md:pt-[24px] pb-20 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      <div className="max-w-[1100px] w-full mx-auto px-5">

        {/* Page Header */}
        <div className="mb-8 border-b pb-5 border-gray-100 dark:border-gray-900">
          <p className={`text-[11px] uppercase tracking-widest ${muted} mb-1 flex items-center gap-1.5`}>
            <Settings size={12} />
            <span>Preferences</span>
          </p>
          <h1 className="text-[22px] font-medium tracking-tight">Account Settings</h1>
          <p className={`text-[13px] ${muted} mt-0.5`}>Manage your personal profile details, copy your friend invitation key, or customize themes.</p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Horizontal Navigation Pills */}
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition-colors flex items-center gap-2 border ${activeTab === item.id
                  ? dark
                    ? 'bg-white text-black border-white'
                    : 'bg-black text-white border-black'
                  : dark
                    ? 'bg-transparent border-gray-800 text-gray-400 hover:text-white hover:bg-gray-900/50'
                    : 'bg-transparent border-gray-200 text-gray-600 hover:text-black hover:bg-gray-50'
                  }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Settings Main Panel */}
          <div className="w-full">
            <div className={cardClass}>

              {activeTab === 'profile' && (
                !userDetails ? (
                  <div className="space-y-5 animate-pulse">
                    <div>
                      <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/4 mb-2"></div>
                      <div className="h-4 bg-gray-100 dark:bg-gray-900/50 rounded w-1/2"></div>
                    </div>
                    <div className="h-20 bg-gray-100 dark:bg-gray-900/50 rounded-xl w-full"></div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="h-10 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full"></div>
                        <div className="h-10 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full"></div>
                      </div>
                      <div className="h-10 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full"></div>
                      <div className="h-24 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full"></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4 border-b pb-5 border-gray-100 dark:border-gray-900">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="group relative w-16 h-16 rounded-full overflow-hidden border border-gray-200 dark:border-gray-800 text-[20px] font-semibold flex items-center justify-center bg-gray-50 dark:bg-gray-900 shrink-0 cursor-pointer select-none shadow-sm transition-transform active:scale-95"
                        title="Upload profile photo"
                      >
                        {userData.avatarUrl ? (
                          <img
                            src={userData.avatarUrl}
                            alt={userData.name}
                            className="w-full h-full object-cover animate-in fade-in duration-300"
                          />
                        ) : auth.currentUser?.photoURL ? (
                          <img
                            src={auth.currentUser.photoURL}
                            alt={userData.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover animate-in fade-in duration-300"
                          />
                        ) : userData.name ? (
                          userData.name.charAt(0).toUpperCase()
                        ) : (
                          '👤'
                        )}

                        {/* Hover Overlay with Camera Icon */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 text-white">
                          <Camera size={15} />
                          <span className="text-[8px] uppercase tracking-wider font-bold">Edit</span>
                        </div>
                      </div>

                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />

                      {/* Hidden Camera Input */}
                      <input
                        type="file"
                        ref={cameraInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                      />

                      <div>
                        <h2 className="text-[15px] font-semibold tracking-tight">{userData.name || 'User'}</h2>
                        <p className={`text-[12.5px] ${muted}`}>{userData.email}</p>
                        <div className="flex gap-2 items-center mt-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[11px] font-medium text-indigo-500 hover:text-indigo-400 transition-colors"
                          >
                            Change Photo
                          </button>
                          <span className="text-zinc-300 dark:text-zinc-700 text-[11px]">•</span>
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="text-[11px] font-medium text-indigo-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
                          >
                            <Camera size={12} />
                            Take Photo
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Friend Code Master Card */}
                    <div className={`p-2 rounded-xl border flex justify-between items-center gap-4 ${dark ? 'border-gray-800 bg-gray-950/20' : 'border-gray-200 bg-gray-50/50'
                      }`}>
                      <div>
                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${muted} mb-1`}>Your Dojo Friend Code</p>
                        <p className="text-[20px] font-mono font-bold tracking-widest text-current">{details.friendCode || '------'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className={secondaryBtn}
                      >
                        {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                        <span>{copied ? 'Copied' : 'Copy Code'}</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {/* Name input */}
                        <div>
                          <label className={labelClass}>Full Name</label>
                          <input
                            type="text"
                            name="name"
                            value={userData.name}
                            onChange={handleInputChange}
                            className={inputClass}
                          />
                        </div>

                        {/* Email input */}
                        <div>
                          <label className={labelClass}>Email Address</label>
                          <div className="relative">
                            <input
                              type="email"
                              name="email"
                              value={userData.email}
                              readOnly
                              disabled
                              className={`${inputClass} select-none opacity-50 cursor-not-allowed`}
                            />
                          </div>
                        </div>
                      </div>


                      {/* Bio */}
                      <div>
                        <label className={labelClass}>Personal Bio</label>
                        <textarea
                          name="bio"
                          value={userData.bio}
                          onChange={handleInputChange}
                          rows={3}
                          placeholder="Tell others a bit about your research studies..."
                          className={`${inputClass} resize-none`}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-gray-50 dark:border-gray-900 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || (userData.name === (details.name || '') && userData.bio === (details.bio || '') && userData.avatarUrl === (details.avatarUrl || auth.currentUser?.photoURL || ''))}
                        className={primaryBtn}
                      >
                        {saving ? 'Saving changes...' : 'Save Settings'}
                      </button>
                    </div>
                  </div>
                )
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-[15px] font-medium tracking-tight">Theme Customization</h2>
                    <p className={`text-[12.5px] ${muted} mt-0.5`}>Switch the Dojo visual interface mode to match your setting.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Light Mode Selector Card */}
                    <div
                      className={`border rounded-xl p-4 cursor-pointer flex flex-col transition-all ${!darkMode
                        ? 'border-black dark:border-white bg-gray-50/50'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600'
                        }`}
                      onClick={() => darkMode && toggleDarkMode()}
                    >
                      <div className="w-full h-24 bg-white rounded-lg mb-3 border border-gray-100 flex items-center justify-center">
                        <span className="text-[12px] font-medium text-gray-400">DojoClass Light</span>
                      </div>
                      <span className="text-[13px] font-medium text-center">Light Aesthetic</span>
                    </div>

                    {/* Dark Mode Selector Card */}
                    <div
                      className={`border rounded-xl p-4 cursor-pointer flex flex-col transition-all ${darkMode
                        ? 'border-white dark:border-black bg-gray-950/20'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                      onClick={() => !darkMode && toggleDarkMode()}
                    >
                      <div className="w-full h-24 bg-black rounded-lg mb-3 border border-gray-900 flex items-center justify-center">
                        <span className="text-[12px] font-medium text-gray-700">DojoClass Dark</span>
                      </div>
                      <span className="text-[13px] font-medium text-center">Dark Aesthetic</span>
                    </div>
                  </div>

                  {/* Onboarding Tour Reset */}
                  <div className="border-t border-gray-100 dark:border-gray-900 pt-6 mt-6">
                    <h3 className="text-[14.5px] font-medium tracking-tight mb-1">Onboarding Guide</h3>
                    <p className={`text-[12.5px] ${muted} mb-4`}>Replay the step-by-step interactive onboarding tour to learn how DojoClass functions.</p>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('dojo_onboarding_completed', 'false');
                        toast.success('Onboarding tour reset! Redirecting to Dashboard...');
                        setTimeout(() => {
                          router.push('/dashboard');
                        }, 1000);
                      }}
                      className={secondaryBtn}
                    >
                      Replay Onboarding Tour
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-[15px] font-medium tracking-tight">Push Notifications</h2>
                    <p className={`text-[12.5px] ${muted} mt-0.5`}>Get notified about study invites, live sessions, post likes, and comments even when DojoClass is closed.</p>
                  </div>

                  {!pushSupported ? (
                    <div className={`p-4 rounded-xl border text-[13px] ${dark ? 'border-gray-800 bg-gray-950/30 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                      Your browser does not support Web Push notifications. Try Chrome, Edge, or Firefox on desktop.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Toggle card */}
                      <div className={`flex items-center justify-between p-4 rounded-xl border ${dark ? 'border-gray-800 bg-gray-950/20' : 'border-gray-200 bg-gray-50/50'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${pushSubscribed
                            ? dark ? 'bg-emerald-950/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                            : dark ? 'bg-gray-900 text-gray-500' : 'bg-gray-100 text-gray-400'
                            }`}>
                            {pushSubscribed ? <BellRing size={16} /> : <BellOff size={16} />}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium">{pushSubscribed ? 'Notifications On' : 'Notifications Off'}</p>
                            <p className={`text-[11px] ${muted}`}>
                              Permission: <span className={`font-semibold ${pushPermission === 'granted' ? 'text-emerald-500'
                                : pushPermission === 'denied' ? 'text-red-500'
                                  : dark ? 'text-gray-300' : 'text-gray-600'
                                }`}>{pushPermission === 'granted' ? 'Granted' : pushPermission === 'denied' ? 'Blocked' : 'Not yet asked'}</span>
                            </p>
                          </div>
                        </div>

                        {/* Toggle switch */}
                        <button
                          id="push-toggle-btn"
                          onClick={handleTogglePush}
                          disabled={pushLoading || pushPermission === 'denied'}
                          aria-label={pushSubscribed ? 'Disable push notifications' : 'Enable push notifications'}
                          className={`relative w-11 h-6 rounded-full border-2 transition-all duration-300 focus:outline-none disabled:opacity-40 ${pushSubscribed
                            ? 'bg-emerald-500 border-emerald-500'
                            : dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-200 border-gray-300'
                            }`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${pushSubscribed ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                        </button>
                      </div>

                      {/* Blocked warning */}
                      {pushPermission === 'denied' && (
                        <div className={`p-3.5 rounded-xl border text-[12px] leading-relaxed ${dark ? 'border-red-500/30 bg-red-950/20 text-red-300' : 'border-red-200 bg-red-50 text-red-700'
                          }`}>
                          <p className="font-semibold mb-0.5">Notifications are blocked in your browser.</p>
                          <p>To re-enable: click the 🔒 icon in your browser address bar → Notifications → Allow.</p>
                        </div>
                      )}

                      {/* What you'll receive */}
                      <div className={`p-4 rounded-xl border space-y-2.5 ${dark ? 'border-gray-800' : 'border-gray-200'}`}>
                        <p className={`text-[11px] uppercase tracking-wider font-semibold ${muted}`}>You will be notified when</p>
                        {[
                          { icon: '📩', label: 'A friend invites you to a study session' },
                          { icon: '▶️', label: 'A study session you joined goes live' },
                          { icon: '❤️', label: 'Someone likes your community post' },
                          { icon: '💬', label: 'Someone comments on or replies to your post' },
                        ].map(({ icon, label }) => (
                          <div key={label} className={`flex items-center gap-2.5 text-[12.5px] ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span>{icon}</span>
                            <span>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {cropModalOpen && imageToCrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col ${dark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
            <div className={`flex items-center justify-between p-4 border-b ${dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
              <h3 className="text-[15px] font-semibold">Crop your photo</h3>
              <button onClick={() => setCropModalOpen(false)} className={`p-1 rounded-full transition-colors ${dark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}>
                <X size={18} />
              </button>
            </div>

            <div className="relative w-full h-[300px] bg-black">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className={`p-4 border-t flex flex-col gap-4 ${dark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-100 bg-zinc-50'}`}>
              <div className="flex items-center gap-3 px-2">
                <span className={`text-[12px] font-medium ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                />
              </div>

              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setCropModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors ${dark ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-zinc-200 text-black hover:bg-zinc-300'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCropSubmit}
                  className="px-5 py-2 rounded-xl text-[13px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  Apply Crop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import API from '@/lib/axios';
import { Image as ImageIcon, Video, X, Send, Loader2, Plus, Camera } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';


interface MediaAttachment {
  file: File;
  localUrl: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  progress: number; // 0-100
  publicUrl?: string;
  uploading: boolean;
  error?: string;
}

interface Post {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatarUrl?: string | null };
  media: { id: string; url: string; type: 'image' | 'video'; thumbnailUrl?: string | null }[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  followedByMe?: boolean;
  community?: {
    id: string;
    name: string;
    slug: string;
    avatarUrl?: string | null;
  } | null;
}

interface CommunityPostComposerProps {
  currentUser: { id: string; name: string; avatarUrl?: string | null };
  dark: boolean;
  onPostCreated: (post: Post) => void;
  initialFile?: File | null;
  communityId?: string;
}


// Generate video thumbnail using canvas
const generateVideoThumbnail = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const capture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    video.addEventListener('loadeddata', () => {
      video.currentTime = 0.5;
    });
    video.addEventListener('seeked', capture, { once: true });
    video.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve('');
    });
    video.load();
  });

// Upload a thumbnail dataURL as a blob
const uploadThumbnail = async (
  dataUrl: string,
  signFn: (fileName: string, mimeType: string) => Promise<{ uploadUrl: string; publicUrl: string }>
): Promise<string> => {
  if (!dataUrl) return '';
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], 'thumb.jpg', { type: 'image/jpeg' });
  const { uploadUrl, publicUrl } = await signFn('thumb.jpg', 'image/jpeg');
  await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': 'image/jpeg' } });
  return publicUrl;
};

export default function CommunityPostComposer({ currentUser, dark, onPostCreated, initialFile, communityId }: CommunityPostComposerProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const MAX_CHARS = 500;
  const MAX_FILES = 5;

  const getAvatar = () => {
    const avatarToRender = currentUser.avatarUrl || auth.currentUser?.photoURL;
    if (avatarToRender) {
      return (
        <img src={avatarToRender} alt={currentUser.name} referrerPolicy="no-referrer"
          className="w-9 h-9 rounded-full object-cover shrink-0" />
      );
    }
    return (
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${dark ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-200 text-zinc-700'}`}>
        {currentUser.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  const signUpload = useCallback(async (fileName: string, mimeType: string) => {
    const { data } = await API.post('/community/media/sign', { fileName, mimeType });
    return data as { uploadUrl: string; publicUrl: string; mediaType: string };
  }, []);

  const uploadFile = useCallback(async (attachment: MediaAttachment, index: number) => {
    try {
      setAttachments((prev) =>
        prev.map((a, i) => (i === index ? { ...a, uploading: true, progress: 0 } : a))
      );

      const signed = await signUpload(attachment.file.name, attachment.file.type);

      // Upload directly to Supabase via signed URL
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setAttachments((prev) =>
              prev.map((a, i) => (i === index ? { ...a, progress: pct } : a))
            );
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('PUT', signed.uploadUrl);
        xhr.setRequestHeader('Content-Type', attachment.file.type);
        xhr.send(attachment.file);
      });

      // For videos: upload thumbnail too
      let thumbPublicUrl: string | undefined;
      if (attachment.type === 'video' && attachment.thumbnailUrl) {
        thumbPublicUrl = await uploadThumbnail(attachment.thumbnailUrl, signUpload);
      }

      setAttachments((prev) =>
        prev.map((a, i) =>
          i === index
            ? { ...a, uploading: false, progress: 100, publicUrl: signed.publicUrl, thumbnailUrl: thumbPublicUrl }
            : a
        )
      );
    } catch (err: any) {
      setAttachments((prev) =>
        prev.map((a, i) =>
          i === index ? { ...a, uploading: false, error: 'Upload failed' } : a
        )
      );
    }
  }, [signUpload]);

  // Handle initial file selection (e.g. from mobile camera quick post)
  useEffect(() => {
    if (!initialFile) return;

    const processInitialFile = async () => {
      const type = initialFile.type.startsWith('video/') ? 'video' : 'image';
      const localUrl = URL.createObjectURL(initialFile);
      const thumbnailUrl = type === 'video' ? await generateVideoThumbnail(initialFile) : undefined;
      const newAttachment: MediaAttachment = {
        file: initialFile,
        localUrl,
        type,
        thumbnailUrl,
        progress: 0,
        uploading: false,
      };

      setAttachments((prev) => {
        if (prev.some((a) => a.file === initialFile)) return prev;
        const updated = [...prev, newAttachment];
        const idx = updated.length - 1;
        uploadFile(newAttachment, idx);
        return updated;
      });
    };

    processInitialFile();
  }, [initialFile, uploadFile]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;

      setIsProcessingFiles(true);
      const remaining = MAX_FILES - attachments.length;
      if (files.length > remaining) {
        toast.error(`Maximum ${MAX_FILES} media attachments allowed`);
      }
      const toAdd = files.slice(0, remaining);

      const newAttachments: MediaAttachment[] = await Promise.all(
        toAdd.map(async (file) => {
          const type = file.type.startsWith('video/') ? 'video' : 'image';
          const localUrl = URL.createObjectURL(file);
          const thumbnailUrl = type === 'video' ? await generateVideoThumbnail(file) : undefined;
          return { file, localUrl, type, thumbnailUrl, progress: 0, uploading: false };
        })
      );

      setAttachments((prev) => {
        const updated = [...prev, ...newAttachments];
        // Start uploads
        newAttachments.forEach((_, idx) => {
          const globalIdx = prev.length + idx;
          uploadFile(updated[globalIdx], globalIdx);
        });
        return updated;
      });

      // Reset input so same file can be re-selected
      e.target.value = '';
      setIsProcessingFiles(false);
    },
    [attachments.length, uploadFile]
  );

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      URL.revokeObjectURL(prev[index].localUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const canSubmit =
    !submitting &&
    !isProcessingFiles &&
    (content.trim().length > 0 || attachments.some((a) => a.publicUrl)) &&
    attachments.every((a) => !a.uploading && !a.error);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const media = attachments
        .filter((a) => a.publicUrl)
        .map((a) => ({
          url: a.publicUrl!,
          type: a.type,
          thumbnailUrl: a.thumbnailUrl ?? undefined,
        }));

      const { data } = await API.post('/community/posts', {
        content: content.trim(),
        media,
        communityId,
      });

      onPostCreated(data.post);
      setContent('');
      setAttachments([]);
    } catch {
      // silent — could add toast
    } finally {
      setSubmitting(false);
    }
  };

  const anyUploading = isProcessingFiles || attachments.some((a) => a.uploading);
  const charLeft = MAX_CHARS - content.length;

  return (
    <div className={`rounded-md p-4 sm:p-5 mb-8 transition-all duration-300 ring-1 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:shadow-md ${dark ? 'bg-[#121214] ring-zinc-800/50' : 'bg-white ring-zinc-200 shadow-sm'}`}>
      <div className="flex gap-3 sm:gap-4">
        {getAvatar()}
        <div className="flex-1 min-w-0 flex flex-col pt-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
            placeholder="What's happening at the dojo?"
            rows={content.length > 0 || attachments.length > 0 ? 3 : 2}
            className={`w-full resize-none text-[15px] leading-relaxed bg-transparent outline-none placeholder:text-zinc-500 transition-all duration-200 mb-2
              ${dark ? 'text-zinc-100' : 'text-zinc-900'}`}
          />

          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800/50 group shrink-0 border border-zinc-200 dark:border-zinc-700/50 transition-transform hover:scale-[1.02]">
                  {att.type === 'image' ? (
                    <img src={att.localUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {att.thumbnailUrl
                        ? <img src={att.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        : <Video size={24} className="text-zinc-500" />
                      }
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Video size={14} className="text-white" />
                      </div>
                    </div>
                  )}

                  {/* Upload progress overlay */}
                  {att.uploading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 backdrop-blur-[2px]">
                      <div className="w-12 h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all duration-200" style={{ width: `${att.progress}%` }} />
                      </div>
                      <span className="text-white text-[10px] font-medium tracking-wide">{att.progress}%</span>
                    </div>
                  )}

                  {/* Error overlay */}
                  {att.error && (
                    <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center backdrop-blur-[2px]">
                      <span className="text-white text-[10px] font-bold tracking-wide">Failed</span>
                    </div>
                  )}

                  {/* Success check */}
                  {att.publicUrl && !att.uploading && !att.error && (
                    <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                      <svg viewBox="0 0 10 10" className="w-3 h-3 text-white fill-none stroke-current" strokeWidth={2.5}>
                        <path d="M2 5l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              ))}

              {/* Add more button */}
              {attachments.length < MAX_FILES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-all shrink-0
                    ${dark
                      ? 'border-zinc-800 hover:border-indigo-500 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10'
                      : 'border-zinc-200 hover:border-indigo-500 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50/50'
                    }`}
                >
                  <Plus size={20} />
                  <span className="text-[10px] font-semibold tracking-wide">Add</span>
                </button>
              )}
            </div>
          )}

          {/* Toolbar */}
          <div className={`flex items-center justify-between pt-3 border-t transition-colors ${dark ? 'border-zinc-800/60' : 'border-zinc-100'}`}>
            <div className="flex items-center gap-0.5 sm:gap-1 -ml-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= MAX_FILES}
                title="Attach image or video"
                className={`p-2.5 rounded-full transition-all disabled:opacity-40 ${dark ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'}`}
              >
                <ImageIcon size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={attachments.length >= MAX_FILES}
                title="Take photo with camera"
                className={`p-2.5 rounded-full transition-all disabled:opacity-40 ${dark ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'}`}
              >
                <Camera size={18} strokeWidth={2} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
              <span className={`text-[12px] font-medium ml-2 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {attachments.length > 0 && `${attachments.length}/${MAX_FILES} files`}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {content.length > 0 && (
                <span className={`text-[12px] font-semibold ${charLeft < 50 ? 'text-red-400' : dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {charLeft}
                </span>
              )}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-[14px] font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white transition-all active:scale-95 shadow-sm hover:shadow-md"
              >
                {submitting || anyUploading
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Send size={16} className="translate-x-[1px]" />
                }
                <span>{submitting ? 'Posting' : anyUploading ? 'Uploading' : 'Post'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

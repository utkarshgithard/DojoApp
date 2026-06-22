'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import API from '@/lib/axios';
import { Image as ImageIcon, Video, X, Send, Loader2, Plus, Camera } from 'lucide-react';
import { auth } from '@/lib/firebase';


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

      const remaining = MAX_FILES - attachments.length;
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

  const anyUploading = attachments.some((a) => a.uploading);
  const charLeft = MAX_CHARS - content.length;

  return (
    <div className={`rounded-xl border p-4 mb-6 transition-colors ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
      <div className="flex gap-3">
        {getAvatar()}
        <div className="flex-1 min-w-0">
          <div className={`rounded-lg border p-3 transition-all duration-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 ${dark
              ? 'bg-zinc-950 border-zinc-800 focus-within:bg-black'
              : 'bg-zinc-50 border-zinc-200 focus-within:bg-white focus-within:shadow-sm'
            }`}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
              placeholder="What's happening at the dojo?"
              rows={3}
              className={`w-full resize-none text-[14px] leading-relaxed bg-transparent outline-none placeholder:text-zinc-400
                ${dark ? 'text-white' : 'text-zinc-900'}`}
            />

            {/* Attachment previews */}
            {attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 group shrink-0 border border-zinc-200 dark:border-zinc-800">
                    {att.type === 'image' ? (
                      <img src={att.localUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {att.thumbnailUrl
                          ? <img src={att.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          : <Video size={24} className="text-zinc-400" />
                        }
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Video size={14} className="text-white" />
                        </div>
                      </div>
                    )}

                    {/* Upload progress overlay */}
                    {att.uploading && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                        <div className="w-12 h-1 bg-white/30 rounded-full overflow-hidden">
                          <div className="h-full bg-white rounded-full transition-all duration-200" style={{ width: `${att.progress}%` }} />
                        </div>
                        <span className="text-white text-[9px] font-semibold">{att.progress}%</span>
                      </div>
                    )}

                    {/* Error overlay */}
                    {att.error && (
                      <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center">
                        <span className="text-white text-[10px] font-semibold">Failed</span>
                      </div>
                    )}

                    {/* Success check */}
                    {att.publicUrl && !att.uploading && !att.error && (
                      <div className="absolute top-1 left-1 w-4.5 h-4.5 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white fill-none stroke-current" strokeWidth={2}>
                          <path d="M2 5l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => removeAttachment(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}

                {/* Add more button */}
                {attachments.length < MAX_FILES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-20 h-20 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all shrink-0
                      ${dark
                        ? 'border-zinc-800 hover:border-indigo-500 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-950/15'
                        : 'border-zinc-300 hover:border-indigo-500 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50/20'
                      }`}
                  >
                    <Plus size={18} />
                    <span className="text-[9px] font-bold">Add more</span>
                  </button>
                )}
              </div>
            )}
          </div>
          {/* Toolbar */}
          <div className={`flex items-center justify-between mt-3 pt-3 border-t ${dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= MAX_FILES}
                title="Attach image or video"
                className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}`}
              >
                <ImageIcon size={18} />
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={attachments.length >= MAX_FILES}
                title="Take photo with camera"
                className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}`}
              >
                <Camera size={18} />
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
              <span className={`text-[11px] ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                {attachments.length > 0 && `${attachments.length}/${MAX_FILES} files`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {content.length > 0 && (
                <span className={`text-[11px] font-medium ${charLeft < 50 ? 'text-orange-400' : dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {charLeft}
                </span>
              )}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-all active:scale-95 shadow-sm"
              >
                {submitting || anyUploading
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Send size={14} />
                }
                <span>{submitting ? 'Posting…' : anyUploading ? 'Uploading…' : 'Post'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

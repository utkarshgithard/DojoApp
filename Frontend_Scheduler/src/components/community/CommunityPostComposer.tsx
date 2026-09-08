import React, { useRef, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Theme, EmojiStyle, EmojiClickData } from 'emoji-picker-react';
import API from '@/lib/axios';
import {
  Image as ImageIcon, Video, X, Send, Loader2, Plus, Camera,
  Bold, Italic, Strikethrough, Code, List, Smile, Link as LinkIcon,
  AtSign, Hash, UploadCloud, Sparkles
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';
import { compressPostImage } from '@/lib/compressImage';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div className="w-[320px] h-[360px] flex flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <Loader2 className="animate-spin text-indigo-500" size={24} />
      <span className="text-[12px] text-zinc-400">Loading emojis…</span>
    </div>
  ),
});

interface MediaAttachment {
  id: string;
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

interface FriendUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  email?: string;
  friendCode?: string;
  username?: string | null;
}

interface CommunityPostComposerProps {
  currentUser: { id: string; name: string; avatarUrl?: string | null };
  dark: boolean;
  onPostCreated: (post: Post) => void;
  initialFile?: File | null;
  communityId?: string;
}

// Popular hashtag suggestions
const POPULAR_HASHTAGS = ['dojo', 'study', 'notes', 'project', 'exam', 'code', 'react', 'nextjs', 'focus'];

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
      canvas.width = Math.min(video.videoWidth, 640);
      canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight) || 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            resolve('');
          }
          URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.8);
      } else {
        URL.revokeObjectURL(url);
        resolve('');
      }
    };

    video.onloadeddata = () => {
      video.currentTime = 0.5;
    };
    video.onseeked = capture;
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
  });

// Upload thumbnail helper
const uploadThumbnail = async (
  thumbnailBlobUrl: string,
  signUploadFn: (fileName: string, mimeType: string) => Promise<{ uploadUrl: string; publicUrl: string }>
): Promise<string | undefined> => {
  try {
    const res = await fetch(thumbnailBlobUrl);
    const blob = await res.blob();
    const { uploadUrl, publicUrl } = await signUploadFn('thumbnail.jpg', 'image/jpeg');

    await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': 'image/jpeg' },
    });

    return publicUrl;
  } catch {
    return undefined;
  }
};

// Convert HTML contents of the contentEditable editor to Markdown syntax
const htmlToMarkdown = (html: string): string => {
  if (!html) return '';

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const convertNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      // Special mention badge tag handling
      if (element.hasAttribute('data-mention')) {
        const handle = element.getAttribute('data-mention') || element.textContent || '';
        return handle.startsWith('@') ? handle : `@${handle}`;
      }

      let childrenContent = '';
      for (let i = 0; i < element.childNodes.length; i++) {
        childrenContent += convertNode(element.childNodes[i]);
      }

      switch (tagName) {
        case 'strong':
        case 'b':
          return childrenContent.trim() ? `**${childrenContent}**` : '';
        case 'em':
        case 'i':
          return childrenContent.trim() ? `*${childrenContent}*` : '';
        case 'del':
        case 's':
        case 'strike':
          return childrenContent.trim() ? `~~${childrenContent}~~` : '';
        case 'code':
          return childrenContent.trim() ? `\`${childrenContent}\`` : '';
        case 'a':
          const href = element.getAttribute('href') || '';
          return childrenContent.trim() ? `[${childrenContent}](${href})` : '';
        case 'ul':
          return childrenContent;
        case 'li':
          return `\n- ${childrenContent}`;
        case 'br':
          return '\n';
        case 'div':
        case 'p':
          return childrenContent ? `\n${childrenContent}` : '\n';
        default:
          return childrenContent;
      }
    }

    return '';
  };

  let markdown = '';
  for (let i = 0; i < tempDiv.childNodes.length; i++) {
    markdown += convertNode(tempDiv.childNodes[i]);
  }

  return markdown.replace(/\n{3,}/g, '\n\n').trim();
};

export default function CommunityPostComposer({
  currentUser,
  dark,
  onPostCreated,
  initialFile,
  communityId,
}: CommunityPostComposerProps) {
  const [content, setContent] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Formatting active states for the toolbar
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isStrike, setIsStrike] = useState(false);
  const [isCodeActive, setIsCodeActive] = useState(false);
  const [isListActive, setIsListActive] = useState(false);
  const [isLinkActive, setIsLinkActive] = useState(false);

  // Smart Autocomplete Popover States
  const [friendsList, setFriendsList] = useState<FriendUser[]>([]);
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  const [showHashtagPopover, setShowHashtagPopover] = useState(false);
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [hashtagIndex, setHashtagIndex] = useState(0);

  // Link dialog states
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const DRAFT_KEY = `dojo_post_draft_${communityId || 'global'}`;

  const MAX_CHARS = 500;
  const MAX_FILES = 5;
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

  // Load user friends for @ mention suggestions
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await API.get('/auth/friends-List');
        if (res.data?.friends) {
          setFriendsList(res.data.friends);
        }
      } catch (err) {
        // Fallback silently if unavailable
      }
    };
    fetchFriends();
  }, []);

  // Restore draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft && editorRef.current && !editorRef.current.innerHTML.trim()) {
        editorRef.current.innerHTML = savedDraft;
        handleEditorChange();
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [DRAFT_KEY]);

  const handleEditorChange = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const html = editorRef.current.innerHTML || '';

    setCharCount(text.length);
    const markdown = htmlToMarkdown(html);
    setContent(markdown);

    const trimmedText = text.trim();
    const isEmpty = trimmedText === '' && editorRef.current.querySelector('img') === null;
    setIsEditorEmpty(isEmpty);

    // Save draft
    try {
      if (isEmpty) {
        localStorage.removeItem(DRAFT_KEY);
      } else {
        localStorage.setItem(DRAFT_KEY, html);
      }
    } catch {
      // Ignore localStorage errors
    }

    // Check for @mention or #hashtag trigger near caret
    detectTriggers();
  }, [DRAFT_KEY]);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const selection = window.getSelection();
    const saved = savedSelectionRef.current;
    if (!selection || !saved || !editorRef.current?.contains(saved.startContainer)) return false;
    selection.removeAllRanges();
    selection.addRange(saved);
    return true;
  }, []);

  // Detect triggers (@ or #) at current caret position
  const detectTriggers = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType !== Node.TEXT_NODE || !editorRef.current.contains(node)) {
      setShowMentionPopover(false);
      setShowHashtagPopover(false);
      return;
    }

    const textBeforeCaret = node.textContent?.slice(0, range.startOffset) || '';

    // Check mention trigger (@)
    const mentionMatch = textBeforeCaret.match(/@([a-zA-Z0-9_\s]{0,20})$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1].toLowerCase());
      setMentionIndex(0);
      setShowMentionPopover(true);
      setShowHashtagPopover(false);
      return;
    } else {
      setShowMentionPopover(false);
    }

    // Check hashtag trigger (#)
    const hashtagMatch = textBeforeCaret.match(/#([a-zA-Z0-9_]{0,20})$/);
    if (hashtagMatch) {
      setHashtagQuery(hashtagMatch[1].toLowerCase());
      setHashtagIndex(0);
      setShowHashtagPopover(true);
      return;
    } else {
      setShowHashtagPopover(false);
    }
  };

  // Filtered lists
  const filteredFriends = friendsList.filter((f) =>
    f.name.toLowerCase().includes(mentionQuery) || (f.username && f.username.toLowerCase().includes(mentionQuery))
  );

  const filteredHashtags = POPULAR_HASHTAGS.filter((h) =>
    h.toLowerCase().includes(hashtagQuery)
  );

  // Insert Mention into Editor
  const insertMention = (friend: FriendUser) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE) {
      const textBeforeCaret = node.textContent?.slice(0, range.startOffset) || '';
      const mentionStart = textBeforeCaret.lastIndexOf('@');

      if (mentionStart !== -1) {
        const textNode = node as Text;
        const textAfterCaret = textNode.textContent?.slice(range.startOffset) || '';

        // Replace trigger text with mention badge element
        const mentionSpan = document.createElement('span');
        mentionSpan.contentEditable = 'false';
        mentionSpan.setAttribute('data-mention', `@${friend.name}`);
        mentionSpan.className = 'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[13px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 mx-0.5 select-none font-sans cursor-pointer hover:bg-indigo-500/25 transition-colors';
        mentionSpan.textContent = `@${friend.name}`;

        const spaceNode = document.createTextNode('\u00A0'); // Non-breaking space

        const newRange = document.createRange();
        newRange.setStart(textNode, mentionStart);
        newRange.setEnd(textNode, range.startOffset);
        newRange.deleteContents();

        newRange.insertNode(spaceNode);
        newRange.insertNode(mentionSpan);

        // Move caret after space
        const caretRange = document.createRange();
        caretRange.setStartAfter(spaceNode);
        caretRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(caretRange);
      }
    }

    setShowMentionPopover(false);
    handleEditorChange();
    saveSelection();
  };

  // Insert Hashtag into Editor
  const insertHashtag = (tag: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE) {
      const textBeforeCaret = node.textContent?.slice(0, range.startOffset) || '';
      const hashStart = textBeforeCaret.lastIndexOf('#');

      if (hashStart !== -1) {
        const textNode = node as Text;
        const hashtagSpan = document.createElement('span');
        hashtagSpan.contentEditable = 'false';
        hashtagSpan.className = 'inline-flex items-center px-1.5 py-0.5 rounded-md text-[12px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 mx-0.5 select-none font-sans';
        hashtagSpan.textContent = `#${tag}`;

        const spaceNode = document.createTextNode('\u00A0');

        const newRange = document.createRange();
        newRange.setStart(textNode, hashStart);
        newRange.setEnd(textNode, range.startOffset);
        newRange.deleteContents();

        newRange.insertNode(spaceNode);
        newRange.insertNode(hashtagSpan);

        const caretRange = document.createRange();
        caretRange.setStartAfter(spaceNode);
        caretRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(caretRange);
      }
    }

    setShowHashtagPopover(false);
    handleEditorChange();
    saveSelection();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Check if image files are pasted
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const files = Array.from(e.clipboardData.files);
      const mediaFiles = files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
      if (mediaFiles.length > 0) {
        e.preventDefault();
        processSelectedFiles(mediaFiles);
        return;
      }
    }

    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    handleEditorChange();
    saveSelection();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Keyboard navigation for Mention Popover
    if (showMentionPopover && filteredFriends.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredFriends.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + filteredFriends.length) % filteredFriends.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredFriends[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionPopover(false);
        return;
      }
    }

    // Keyboard navigation for Hashtag Popover
    if (showHashtagPopover && filteredHashtags.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHashtagIndex((prev) => (prev + 1) % filteredHashtags.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHashtagIndex((prev) => (prev - 1 + filteredHashtags.length) % filteredHashtags.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertHashtag(filteredHashtags[hashtagIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowHashtagPopover(false);
        return;
      }
    }

    // Command shortcuts (Ctrl+Enter to post, Ctrl+B, Ctrl+I)
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleSubmit();
        return;
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        toggleBold();
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        toggleItalic();
      }
    }
  };

  const checkSelection = () => {
    if (typeof window === 'undefined') return;

    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsStrike(document.queryCommandState('strikeThrough'));
    setIsListActive(document.queryCommandState('insertUnorderedList'));

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let node: Node | null = selection.getRangeAt(0).startContainer;
      let insideCode = false;
      let insideLink = false;

      while (node && node !== editorRef.current) {
        if (node && node.nodeName === 'CODE') {
          insideCode = true;
        }
        if (node && node.nodeName === 'A') {
          insideLink = true;
        }
        node = node ? node.parentNode : null;
      }

      setIsCodeActive(insideCode);
      setIsLinkActive(insideLink);
    }
  };

  const toggleBold = () => {
    document.execCommand('bold', false);
    checkSelection();
    handleEditorChange();
  };

  const toggleItalic = () => {
    document.execCommand('italic', false);
    checkSelection();
    handleEditorChange();
  };

  const toggleStrike = () => {
    document.execCommand('strikeThrough', false);
    checkSelection();
    handleEditorChange();
  };

  const toggleList = () => {
    document.execCommand('insertUnorderedList', false);
    checkSelection();
    handleEditorChange();
  };

  const toggleCode = () => {
    restoreSelection();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current?.contains(selection.anchorNode)) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    let node: Node | null = range.startContainer;
    let codeNode: HTMLElement | null = null;

    while (node && node !== editorRef.current) {
      if (node.nodeName === 'CODE') {
        codeNode = node as HTMLElement;
        break;
      }
      node = node.parentNode;
    }

    if (codeNode) {
      const parent = codeNode.parentNode;
      if (parent) {
        const textNode = document.createTextNode(codeNode.textContent || '');
        parent.replaceChild(textNode, codeNode);

        const caretRange = document.createRange();
        caretRange.selectNodeContents(textNode);
        selection.removeAllRanges();
        selection.addRange(caretRange);
      }
    } else {
      const codeElement = document.createElement('code');
      codeElement.className = "px-1.5 py-0.5 rounded text-[13px] font-mono border bg-zinc-150 dark:bg-zinc-800 text-indigo-500 border-zinc-250 dark:border-zinc-700";
      codeElement.textContent = selectedText || 'code';

      range.deleteContents();
      range.insertNode(codeElement);

      range.setStartAfter(codeElement);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    handleEditorChange();
    checkSelection();
  };

  const toggleLink = () => {
    if (showLinkModal) {
      setShowLinkModal(false);
      return;
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let node: Node | null = selection.getRangeAt(0).startContainer;
      let linkNode: HTMLAnchorElement | null = null;

      while (node && node !== editorRef.current) {
        if (node.nodeName === 'A') {
          linkNode = node as HTMLAnchorElement;
          break;
        }
        node = node.parentNode;
      }

      if (linkNode) {
        const parent = linkNode.parentNode;
        if (parent) {
          const textNode = document.createTextNode(linkNode.textContent || '');
          parent.replaceChild(textNode, linkNode);
        }
        handleEditorChange();
        checkSelection();
        return;
      }
    }

    handleOpenLinkModal();
  };

  const handleOpenLinkModal = () => {
    restoreSelection();
    const selection = window.getSelection();
    const selectedText = selection && editorRef.current?.contains(selection.anchorNode)
      ? selection.toString()
      : '';
    setLinkName(selectedText);
    setLinkUrl('');
    setShowLinkModal(true);
  };

  const handleInsertLinkSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!linkUrl.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    let formattedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const displayName = linkName.trim() || formattedUrl;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const a = document.createElement('a');
      a.href = formattedUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'text-blue-600 dark:text-blue-400 underline font-medium hover:text-blue-700 cursor-pointer';
      a.textContent = displayName;

      range.deleteContents();
      range.insertNode(a);
      range.setStartAfter(a);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      handleEditorChange();
    } else {
      insertTextAtCursor(`[${displayName}](${formattedUrl}) `);
    }

    setShowLinkModal(false);
    setLinkName('');
    setLinkUrl('');
    toast.success('Link added to post');
  };

  const insertTextAtCursor = (text: string) => {
    if (!editorRef.current) return;
    const hadSavedSelection = restoreSelection();
    editorRef.current.focus();
    if (hadSavedSelection) restoreSelection();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editorRef.current.innerHTML += text;
      handleEditorChange();
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    handleEditorChange();
    saveSelection();
  };

  const insertEmoji = (emoji: string) => {
    insertTextAtCursor(emoji);
  };

  const getAvatar = () => {
    const avatarToRender = currentUser.avatarUrl || auth.currentUser?.photoURL;
    if (avatarToRender) {
      return (
        <img src={avatarToRender} alt={currentUser.name} referrerPolicy="no-referrer"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 ring-2 ring-indigo-500/20" />
      );
    }
    return (
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0 shadow-inner ${dark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-700'}`}>
        {(currentUser?.name || 'U').charAt(0).toUpperCase()}
      </div>
    );
  };

  const signUpload = useCallback(async (fileName: string, mimeType: string) => {
    const { data } = await API.post('/community/media/sign', { fileName, mimeType, purpose: 'post' });
    return data as { uploadUrl: string; publicUrl: string; mediaType: string };
  }, []);

  const uploadFile = useCallback(async (attachment: MediaAttachment) => {
    try {
      setAttachments((prev) =>
        prev.map((a) => (a.id === attachment.id ? { ...a, uploading: true, progress: 0 } : a))
      );

      const fileToUpload = attachment.type === 'image'
        ? await compressPostImage(attachment.file)
        : attachment.file;

      const signed = await signUpload(fileToUpload.name, fileToUpload.type);
      const publicUrl = signed.publicUrl;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setAttachments((prev) =>
              prev.map((a) => (a.id === attachment.id ? { ...a, progress: pct } : a))
            );
          }
        });
        xhr.open('PUT', signed.uploadUrl);
        xhr.setRequestHeader('Content-Type', fileToUpload.type);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(fileToUpload);
      });

      let thumbPublicUrl: string | undefined;
      if (attachment.type === 'video' && attachment.thumbnailUrl) {
        thumbPublicUrl = await uploadThumbnail(attachment.thumbnailUrl, signUpload);
      }

      setAttachments((prev) =>
        prev.map((a) =>
          a.id === attachment.id
            ? { ...a, uploading: false, progress: 100, publicUrl, thumbnailUrl: thumbPublicUrl }
            : a
        )
      );
    } catch (err: any) {
      console.error('[CommunityPostComposer] Media upload failed', err);
      const serverMessage = err?.response?.data?.error;
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === attachment.id
            ? { ...a, uploading: false, error: serverMessage || 'Upload failed' }
            : a
        )
      );
    }
  }, [signUpload]);

  useEffect(() => {
    if (!initialFile) return;

    const processInitialFile = async () => {
      const type = initialFile.type.startsWith('video/') ? 'video' : 'image';
      const localUrl = URL.createObjectURL(initialFile);
      const thumbnailUrl = type === 'video' ? await generateVideoThumbnail(initialFile) : undefined;
      const id = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const newAttachment: MediaAttachment = {
        id,
        file: initialFile,
        localUrl,
        type,
        thumbnailUrl,
        progress: 0,
        uploading: false,
      };

      setAttachments((prev) => {
        if (prev.some((a) => a.file === initialFile)) return prev;
        return [...prev, newAttachment];
      });

      uploadFile(newAttachment);
    };

    processInitialFile();
  }, [initialFile, uploadFile]);

  const processSelectedFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      setIsProcessingFiles(true);
      const remaining = MAX_FILES - attachments.length;
      if (files.length > remaining) {
        toast.error(`Maximum ${MAX_FILES} media attachments allowed`);
      }
      const toAdd = files
        .filter((file) => {
          const isImage = file.type.startsWith('image/');
          const isVideo = file.type.startsWith('video/');
          const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
          if (!isImage && !isVideo) {
            toast.error(`${file.name} is not a supported image or video`);
            return false;
          }
          if (file.size > maxSize) {
            toast.error(`${file.name} is too large (max ${isVideo ? '50 MB' : '10 MB'})`);
            return false;
          }
          return true;
        })
        .slice(0, remaining);

      const newAttachments: MediaAttachment[] = await Promise.all(
        toAdd.map(async (file) => {
          const type = file.type.startsWith('video/') ? 'video' : 'image';
          const localUrl = URL.createObjectURL(file);
          const thumbnailUrl = type === 'video' ? await generateVideoThumbnail(file) : undefined;
          const id = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
          return { id, file, localUrl, type, thumbnailUrl, progress: 0, uploading: false };
        })
      );

      setAttachments((prev) => [...prev, ...newAttachments]);

      newAttachments.forEach((att) => {
        uploadFile(att);
      });

      setIsProcessingFiles(false);
    },
    [attachments.length, uploadFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    processSelectedFiles(files);
    e.target.value = '';
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      processSelectedFiles(droppedFiles);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) {
        URL.revokeObjectURL(target.localUrl);
        if (target.thumbnailUrl?.startsWith('blob:')) URL.revokeObjectURL(target.thumbnailUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const canSubmit =
    !submitting &&
    !isProcessingFiles &&
    (charCount > 0 || attachments.some((a) => a.publicUrl)) &&
    charCount <= MAX_CHARS &&
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

      const finalMarkdown = htmlToMarkdown(editorRef.current?.innerHTML || '');

      const { data } = await API.post('/community/posts', {
        content: finalMarkdown.trim(),
        media,
        communityId,
      });

      onPostCreated(data.post);

      // Clear editor and reset state
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setContent('');
      setCharCount(0);
      setIsEditorEmpty(true);
      setAttachments([]);
      setShowEmojiPicker(false);

      // Remove draft
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Ignore
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to publish your post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const anyUploading = isProcessingFiles || attachments.some((a) => a.uploading);
  const charLeft = MAX_CHARS - charCount;
  const progressRatio = Math.min((charCount / MAX_CHARS) * 100, 100);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative z-30 rounded-2xl p-3 sm:p-5 mb-6 transition-all duration-300 border shadow-md focus-within:shadow-indigo-500/10 focus-within:ring-2 focus-within:ring-indigo-500/40 backdrop-blur-md ${isDragging
        ? 'border-indigo-500 ring-4 ring-indigo-500/20 scale-[1.01] bg-indigo-500/5'
        : dark
          ? 'bg-zinc-900/70 border-zinc-800/80 shadow-black/40'
          : 'bg-white/90 border-zinc-200 shadow-zinc-200/60'
        }`}
    >
      {/* Drag & Drop Overlay Cue */}
      {isDragging && (
        <div className="absolute inset-0 z-50 rounded-2xl bg-indigo-600/15 backdrop-blur-sm border-2 border-dashed border-indigo-500 flex flex-col items-center justify-center gap-2 pointer-events-none animate-in fade-in duration-200">
          <UploadCloud size={36} className="text-indigo-500 animate-bounce" />
          <span className="text-[14px] font-bold text-indigo-600 dark:text-indigo-400">Drop media files here</span>
        </div>
      )}

      <div className="display:flex flex-col sm:gap-4">

        <div className="flex-1 min-w-0 flex flex-col pt-1 relative">

          {/* Main ContentEditable Editor Area */}
          <div className="relative min-h-[110px] mb-2 dojo-editor">
            <style dangerouslySetInnerHTML={{
              __html: `
              .dojo-editor [contenteditable] {
                font-size: 16px !important;
                line-height: 1.65 !important;
                letter-spacing: -0.01em !important;
              }
              .dojo-editor ul {
                list-style-type: disc !important;
                padding-left: 1.25rem !important;
                margin-top: 0.35rem !important;
                margin-bottom: 0.35rem !important;
              }
              .dojo-editor li {
                display: list-item !important;
              }
              .dojo-editor a {
                color: #6366f1 !important;
                text-decoration: underline !important;
                font-weight: 600 !important;
              }
              .dojo-editor code {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                padding: 0.15rem 0.4rem !important;
                border-radius: 0.375rem !important;
                font-size: 0.85rem !important;
                border: 1px solid rgba(99, 102, 241, 0.25) !important;
                background: rgba(99, 102, 241, 0.08) !important;
                color: #6366f1 !important;
              }
            `}} />

            {isEditorEmpty && (
              <div className="absolute top-0  left-0 pointer-events-none italic text-gray-400 dark:text-zinc-500 text-[16px] leading-relaxed select-none font-normal">
                <span className="font-normal text-gray-400 font-italic">@</span> to mention
              </div>
            )}

            <div
              ref={editorRef}
              contentEditable
              onInput={() => {
                handleEditorChange();
                saveSelection();
              }}
              onKeyDown={handleKeyDown}
              onKeyUp={() => {
                checkSelection();
                saveSelection();
                detectTriggers();
              }}
              onMouseUp={() => {
                checkSelection();
                saveSelection();
                detectTriggers();
              }}
              onFocus={() => {
                checkSelection();
                saveSelection();
              }}
              onBlur={saveSelection}
              onPaste={handlePaste}
              className={`w-full min-h-[110px] outline-none text-[16px] leading-relaxed tracking-[-0.01em] bg-transparent font-normal break-words transition-colors ${dark ? 'text-zinc-100 placeholder-zinc-500' : 'text-zinc-900 placeholder-zinc-400'
                }`}
              style={{ wordBreak: 'break-word' }}
            />
          </div>

          {/* Twitter @ Mention Autocomplete Popover */}
          {showMentionPopover && (
            <div className={`absolute top-full left-0 mt-1 z-50 w-72 max-h-60 overflow-y-auto rounded-2xl border shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-150 ${dark ? 'bg-zinc-950/95 border-zinc-800 text-white shadow-black/80' : 'bg-white/95 border-zinc-200 text-zinc-900 shadow-zinc-300/80'
              }`}>
              <div className="px-2.5 py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <span className="flex items-center gap-1"><AtSign size={12} className="text-indigo-500" /> Mention People</span>
                <span>{filteredFriends.length} found</span>
              </div>
              {filteredFriends.length === 0 ? (
                <div className="p-3 text-center text-[12.5px] text-zinc-400">
                  No friends matching &quot;{mentionQuery}&quot;
                </div>
              ) : (
                filteredFriends.map((friend, idx) => (
                  <button
                    key={friend.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(friend);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors ${idx === mentionIndex
                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : dark ? 'hover:bg-zinc-900 text-zinc-200' : 'hover:bg-zinc-50 text-zinc-800'
                      }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold text-[12px] shrink-0">
                      {friend.avatarUrl ? (
                        <img src={friend.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        friend.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] leading-tight font-medium truncate">{friend.name}</div>
                      {friend.username && (
                        <div className="text-[11px] text-zinc-400 truncate">@{friend.username}</div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Twitter # Hashtag Autocomplete Popover */}
          {showHashtagPopover && (
            <div className={`absolute top-full left-0 mt-1 z-50 w-64 max-h-56 overflow-y-auto rounded-2xl border shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-150 ${dark ? 'bg-zinc-950/95 border-zinc-800 text-white shadow-black/80' : 'bg-white/95 border-zinc-200 text-zinc-900 shadow-zinc-300/80'
              }`}>
              <div className="px-2.5 py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <span className="flex items-center gap-1"><Hash size={12} className="text-indigo-500" /> Topic Hashtags</span>
              </div>
              {filteredHashtags.length === 0 ? (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertHashtag(hashtagQuery);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left font-semibold text-indigo-500 transition-colors ${dark ? 'hover:bg-zinc-900' : 'hover:bg-zinc-50'
                    }`}
                >
                  <Sparkles size={14} />
                  <span className="text-[13px]">Create #{hashtagQuery}</span>
                </button>
              ) : (
                filteredHashtags.map((tag, idx) => (
                  <button
                    key={tag}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertHashtag(tag);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-colors ${idx === hashtagIndex
                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : dark ? 'hover:bg-zinc-900 text-zinc-200' : 'hover:bg-zinc-50 text-zinc-800'
                      }`}
                  >
                    <span className="font-bold text-indigo-500 text-[14px]">#</span>
                    <span className="text-[13px]">{tag}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Attachment Previews */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2.5">
              {attachments.map((att) => (
                <div key={att.id} className="relative w-20 h-20 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800/60 group shrink-0 border border-zinc-200 dark:border-zinc-700/60 transition-transform hover:scale-[1.02] shadow-sm">
                  {att.type === 'image' ? (
                    <img src={att.localUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {att.thumbnailUrl
                        ? <img src={att.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        : <Video size={24} className="text-zinc-500" />
                      }
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <Video size={14} className="text-white" />
                      </div>
                    </div>
                  )}

                  {/* Upload progress overlay */}
                  {att.uploading && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1.5 backdrop-blur-[2px]">
                      <div className="w-12 h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full transition-all duration-200" style={{ width: `${att.progress}%` }} />
                      </div>
                      <span className="text-white text-[10px] font-bold tracking-wide">{att.progress}%</span>
                    </div>
                  )}

                  {/* Error overlay */}
                  {att.error && (
                    <div className="absolute inset-0 bg-rose-600/90 flex items-center justify-center backdrop-blur-[2px]">
                      <button
                        type="button"
                        onClick={() => uploadFile({ ...att, error: undefined, publicUrl: undefined })}
                        className="text-white text-[10px] font-bold tracking-wide underline underline-offset-2 hover:no-underline"
                      >
                        Retry
                      </button>
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
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
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
                  className={`w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-all duration-200 shrink-0 ${dark
                    ? 'border-zinc-800 hover:border-indigo-500/60 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10'
                    : 'border-zinc-200 hover:border-indigo-400 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50/60'
                    }`}
                >
                  <Plus size={20} />
                  <span className="text-[10px] font-bold tracking-wide">Add</span>
                </button>
              )}
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className={`flex flex-col flex-wrap items-center justify-between gap-y-1.5 pt-3 mt-1 border-t transition-colors ${dark ? 'border-zinc-800/80' : 'border-zinc-100'
            }`}>
            <div className="flex flex-wrap items-center gap-1  relative">

              {/* Text Formatting Controls */}
              <button
                type="button"
                onClick={toggleBold}
                title="Bold (Ctrl+B)"
                className={`p-1.5 rounded-lg text-[13px] transition-all duration-200 active:scale-95 ${isBold
                  ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-500/15 font-bold scale-105'
                  : dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
              >
                <Bold size={16} />
              </button>
              <button
                type="button"
                onClick={toggleItalic}
                title="Italic (Ctrl+I)"
                className={`p-1.5 rounded-lg text-[13px] transition-all duration-200 active:scale-95 ${isItalic
                  ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-500/15 font-bold scale-105'
                  : dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
              >
                <Italic size={16} />
              </button>
              <button
                type="button"
                onClick={toggleStrike}
                title="Strikethrough"
                className={`p-1.5 rounded-lg text-[13px] transition-all duration-200 active:scale-95 ${isStrike
                  ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-500/15 font-bold scale-105'
                  : dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
              >
                <Strikethrough size={16} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                }}
                onClick={toggleCode}
                title="Code snippet"
                className={`p-1.5 rounded-lg text-[13px] transition-all duration-200 active:scale-95 ${isCodeActive
                  ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-500/15 font-bold scale-105'
                  : dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
              >
                <Code size={16} />
              </button>
              <button
                type="button"
                onClick={toggleList}
                title="Bullet List"
                className={`p-1.5 rounded-lg text-[13px] transition-all duration-200 active:scale-95 ${isListActive
                  ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-500/15 font-bold scale-105'
                  : dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
              >
                <List size={16} />
              </button>
              <button
                type="button"
                onClick={handleOpenLinkModal}
                title="Insert Web Link"
                className={`p-1.5 rounded-lg transition-all duration-200 active:scale-95 ${isLinkActive || showLinkModal
                  ? 'text-blue-500 dark:text-blue-400 bg-blue-500/15 font-bold scale-105'
                  : dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
              >
                <LinkIcon size={16} />
              </button>


              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
              {/* Media Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= MAX_FILES}
                title="Attach photo or video"
                className={`p-2 rounded-xl transition-all duration-200 disabled:opacity-40 flex items-center gap-1.5 text-[13px] font-semibold ${dark
                  ? ' hover:text-indigo-300 hover:bg-indigo-500/15'
                  : 'hover:text-indigo-700 hover:bg-indigo-50'
                  }`}
              >
                <ImageIcon size={18} strokeWidth={2} />
              </button>

              {/* Camera Button */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={attachments.length >= MAX_FILES}
                title="Take photo with camera"
                className={`p-2 rounded-xl transition-all duration-200 disabled:opacity-40 ${dark
                  ? ' hover:text-indigo-300 hover:bg-indigo-500/15'
                  : ' hover:text-indigo-700 hover:bg-indigo-50'
                  }`}
              >
                <Camera size={18} strokeWidth={2} />
              </button>

              {/* Emoji Picker Trigger */}
              <button
                type="button"
                onMouseDown={saveSelection}
                onClick={() => setShowEmojiPicker((v) => !v)}
                title="Insert Emojis"
                className={`p-2 rounded-xl transition-all duration-200 ${showEmojiPicker
                  ? ' bg-amber-500/10'
                  : dark
                    ? ' hover:text-amber-300 hover:bg-amber-500/15'
                    : ' hover:text-amber-700 hover:bg-amber-50'
                  }`}
              >
                <Smile size={18} strokeWidth={2} />
              </button>


              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

              {/* Mention button trigger */}
              <button
                type="button"
                onClick={() => insertTextAtCursor('@')}
                title="Mention User (@)"
                className={`p-1.5 rounded-lg transition-all duration-200 text-[13px] font-bold ${dark
                  ? 'text-gray-600 hover:text-indigo-300 hover:bg-indigo-500/15'
                  : 'text-gray-600 hover:text-indigo-700 hover:bg-indigo-50'
                  }`}
              >
                <AtSign size={17} strokeWidth={2} />
              </button>

              {/* Hashtag trigger */}
              <button
                type="button"
                onClick={() => insertTextAtCursor('#')}
                title="Add Hashtag (#)"
                className={`p-1.5 rounded-lg transition-all duration-200 text-[13px] font-bold ${dark
                  ? 'text-gray-600 hover:text-indigo-300 hover:bg-indigo-500/15'
                  : 'text-gray-800 hover:text-indigo-700 hover:bg-indigo-50'
                  }`}
              >
                <Hash size={17} strokeWidth={2} />
              </button>

              {/* Emoji Popover Menu */}
              {showEmojiPicker && (
                <>
                  <div className="fixed inset-0 z-[90]" onClick={() => setShowEmojiPicker(false)} />
                  <div className={`absolute top-full left-0 mt-2 z-[100] shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border max-w-[calc(100vw-32px)] ${dark ? 'border-zinc-800 shadow-black/80 bg-zinc-950' : 'border-zinc-200 shadow-zinc-300/80 bg-white'
                    }`}>
                    <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/90 dark:bg-zinc-900/90">
                      <span className="text-[12px] font-bold text-zinc-600 dark:text-zinc-300">Emojis</span>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(false)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md transition-colors"
                        title="Close"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <EmojiPicker
                      onEmojiClick={(emojiData: EmojiClickData) => {
                        insertEmoji(emojiData.emoji);
                      }}
                      theme={dark ? Theme.DARK : Theme.LIGHT}
                      emojiStyle={EmojiStyle.APPLE}
                      lazyLoadEmojis={true}
                      searchPlaceHolder="Search emojis…"
                      width={330}
                      height={390}
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                </>
              )}

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
              {attachments.length > 0 && (
                <span className={`text-[11.5px] font-semibold ml-2 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {attachments.length}/{MAX_FILES}
                </span>
              )}
            </div>

            {/* Twitter-style Circular Character Ring & Submit Button */}
            <div className="flex w-full justify-end items-center gap-2.5 sm:gap-3">
              {/* {charCount > 0 && (
                <div className="flex  gap-2">
                  <div className="relative w-6 h-6 flex justify-end">
                    <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                      <circle
                        className="stroke-zinc-200 dark:stroke-zinc-800 fill-none"
                        strokeWidth="2.5"
                        r="9"
                        cx="12"
                        cy="12"
                      />
                      <circle
                        className={`fill-none transition-all duration-200 ease-out ${charCount > MAX_CHARS
                          ? 'stroke-rose-500 animate-pulse'
                          : charLeft < 20
                            ? 'stroke-amber-500'
                            : 'stroke-indigo-500 dark:stroke-indigo-400'
                          }`}
                        strokeWidth="2.5"
                        strokeDasharray={2 * Math.PI * 9}
                        strokeDashoffset={(2 * Math.PI * 9) - (progressRatio / 100) * (2 * Math.PI * 9)}
                        strokeLinecap="round"
                        r="9"
                        cx="12"
                        cy="12"
                      />
                    </svg>
                  </div>
                  {(charLeft < 50 || charCount > MAX_CHARS) && (
                    <span className={`text-[11.5px] font-bold transition-colors duration-200 ${charCount > MAX_CHARS
                      ? 'text-rose-500'
                      : charLeft < 20
                        ? 'text-amber-500'
                        : dark ? 'text-zinc-500' : 'text-zinc-400'
                      }`}>
                      {charLeft}
                    </span>
                  )}
                </div>
              )} */}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="group relative flex shrink-0 items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-[13.5px]  bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:hover:from-indigo-600 disabled:hover:to-violet-600 text-white transition-all duration-300 shadow-md shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-500/35 active:scale-95"
              >
                {submitting || anyUploading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : ""}
                <span>{submitting ? 'Posting...' : anyUploading ? 'Uploading...' : 'Post'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Link Popup Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl relative ${dark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
            }`}>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${dark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                  <LinkIcon size={18} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold tracking-tight">Add Web Link</h3>
                  <p className={`text-[11.5px] ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>Add a clickable URL and display title</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleInsertLinkSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold tracking-wide uppercase text-zinc-500 dark:text-zinc-400">
                  Link Name / Title (Optional)
                </label>
                <input
                  type="text"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="e.g. My Notes / Study Resource"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-[13.5px] outline-none transition-colors ${dark
                    ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 focus:border-blue-500'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-blue-500'
                    }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-bold tracking-wide uppercase text-zinc-500 dark:text-zinc-400">
                  Link URL <span className="text-blue-500">*</span>
                </label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="e.g. https://example.com"
                  required
                  autoFocus
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-[13.5px] outline-none transition-colors ${dark
                    ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 focus:border-blue-500'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-blue-500'
                    }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-[13px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 active:scale-95 transition-all"
                >
                  Add Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import API from '@/lib/axios';
import { Heart, MessageCircle, Trash2, MoreHorizontal, Share2, UserPlus, UserCheck, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { useRouter } from 'next/navigation';
import CommunityMediaGrid from './CommunityMediaGrid';
import CommunityCommentSection from './CommunityCommentSection';
import ShareModal from './ShareModal';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/authContext';
import { usePostContext } from '@/context/PostContext';
import { useNetwork } from '@/context/NetworkContext';
import { Edit2, Save, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';

interface PostAuthor {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface PostMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string | null;
}

interface Post {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  media: PostMedia[];
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

const parseMarkdownTokens = (text: string, dark: boolean): React.ReactNode[] => {
  // Match formatting, markdown links, hashtags, and plain URLs.
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|`[^`]+`|#[a-zA-Z0-9_]+|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s<]+|www\.[^\s<]+)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-bold text-indigo-500 dark:text-indigo-300">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={idx} className="italic font-serif">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('~~') && part.endsWith('~~')) {
      return <del key={idx} className="line-through opacity-75">{part.slice(2, -2)}</del>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className={`px-1.5 py-0.5 rounded text-[13px] font-mono border ${
          dark ? 'bg-zinc-950 border-zinc-800 text-indigo-300' : 'bg-indigo-50/80 border-indigo-200 text-indigo-700'
        }`}>
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('#')) {
      return (
        <span key={idx} className="font-bold text-indigo-500 hover:underline cursor-pointer">
          {part}
        </span>
      );
    }
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const title = part.substring(1, part.indexOf(']('));
      let rawUrl = part.substring(part.indexOf('](') + 2, part.length - 1);
      const url = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`;
      return (
        <a
          key={idx}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 underline font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1 mx-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={13} className="shrink-0" />
          <span>{title}</span>
        </a>
      );
    }
    if (/^(https?:\/\/|www\.)/i.test(part)) {
      const trailing = part.match(/[.,!?;:)\]]+$/)?.[0] || '';
      const linkText = trailing ? part.slice(0, -trailing.length) : part;
      const url = linkText.startsWith('www.') ? `https://${linkText}` : linkText;
      return (
        <a
          key={idx}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 underline font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {linkText}
          {trailing}
        </a>
      );
    }
    return part;
  });
};

const renderFormattedContent = (content: string, dark: boolean) => {
  if (!content) return null;
  const lines = content.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, lineIdx) => {
        const isList = line.trim().startsWith('- ') || line.trim().startsWith('* ');
        const textToParse = isList ? line.trim().substring(2) : line;
        const tokens = parseMarkdownTokens(textToParse, dark);

        if (isList) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-2 my-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
              <div className={`text-[14.5px] leading-relaxed break-words font-normal ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                {tokens}
              </div>
            </div>
          );
        }

        return (
          <p key={lineIdx} className={`text-[14.5px] leading-relaxed break-words font-normal ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            {tokens}
          </p>
        );
      })}
    </div>
  );
};

interface CommunityPostCardProps {
  post: Post;
  currentUserId: string;
  dark: boolean;
  onDelete?: (postId: string) => void;
  onUserClick?: (userId: string) => void;
  defaultShowComments?: boolean;
  isModerator?: boolean;
}

export default function CommunityPostCard({
  post,
  currentUserId,
  dark,
  onDelete,
  onUserClick,
  defaultShowComments,
  isModerator,
}: CommunityPostCardProps) {
  const { userDetails } = useAuth() as any;
  const { postStates, syncPostState, updatePostState } = usePostContext();
  const { followStates, syncFollowState, toggleFollow } = useNetwork();

  React.useEffect(() => {
    syncPostState(post.id, {
      likeCount: post.likeCount,
      likedByMe: post.likedByMe,
      commentCount: post.commentCount,
    });
    if (post.followedByMe !== undefined && currentUserId && post.author?.id !== currentUserId) {
      syncFollowState(post.author?.id, post.followedByMe);
    }
  }, [post.id, post.likeCount, post.likedByMe, post.commentCount, post.followedByMe, post.author?.id, currentUserId, syncPostState, syncFollowState]);

  const currentState = postStates[post.id] || {
    likeCount: post.likeCount,
    likedByMe: post.likedByMe,
    commentCount: post.commentCount,
  };

  const following = followStates[post.author?.id] || false;
  const liked = currentState.likedByMe;
  const likeCount = currentState.likeCount;
  const commentCount = currentState.commentCount;
  const [showComments, setShowComments] = useState(defaultShowComments ?? false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [savingEdit, setSavingEdit] = useState(false);
  const [currentPostContent, setCurrentPostContent] = useState(post.content);

  const router = useRouter();
  const isOwnPost = post.author?.id === currentUserId;
  const isAdmin = userDetails?.role === 'admin';

  const handleUserClick = () => {
    if (onUserClick) {
      onUserClick(post.author?.id);
    } else {
      router.push(`/user/${post.author?.id}`);
    }
  };

  const handleLike = async () => {
    if (!currentUserId) {
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
      return;
    }
    const wasLiked = liked;
    updatePostState(post.id, {
      likedByMe: !wasLiked,
      likeCount: wasLiked ? Math.max(0, likeCount - 1) : likeCount + 1,
    });
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 300);
    try {
      await API.post(`/community/posts/${post.id}/like`);
    } catch {
      toast.error('Failed to like post');
      // Revert on error
      updatePostState(post.id, {
        likedByMe: wasLiked,
        likeCount: likeCount,
      });
    }
  };

  const handleFollowClick = async () => {
    if (!currentUserId) {
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
      return;
    }
    if (followLoading) return;
    setFollowLoading(true);
    try {
      await toggleFollow(post.author?.id);
    } catch {
      toast.error('Failed to follow user');
      // Errors are handled inside toggleFollow (optimistic revert)
    } finally {
      setFollowLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      if (post.community?.slug && isModerator && !isOwnPost) {
        await API.delete(`/groups/${post.community.slug}/posts/${post.id}`);
      } else {
        await API.delete(`/community/posts/${post.id}`);
      }
      onDelete?.(post.id);
      toast.success('Post deleted successfully');
    } catch {
      toast.error('Failed to delete post');
      setDeleting(false);
    }
  };

  const handleEditSave = async () => {
    if (!editContent.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      await API.put(`/community/posts/${post.id}`, { content: editContent.trim() });
      setCurrentPostContent(editContent.trim());
      setIsEditing(false);
      toast.success('Post edited successfully');
    } catch {
      toast.error('Failed to edit post');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCommentToggle = () => setShowComments((v: boolean) => !v);
  const handleCommentAdded = () => updatePostState(post.id, { commentCount: commentCount + 1 });

  const getAvatar = (author: PostAuthor) => {
    let avatarToRender = author.avatarUrl;
    if (author.id === currentUserId) {
      avatarToRender = userDetails?.avatarUrl || author.avatarUrl || auth.currentUser?.photoURL || null;
    }
    if (avatarToRender) {
      return (
        <img
          src={avatarToRender}
          alt={author.name}
          referrerPolicy="no-referrer"
          className="w-10 h-10 rounded-full object-cover shrink-0"
        />
      );
    }
    const colors = [
      'from-indigo-400 to-purple-500',
      'from-pink-400 to-rose-500',
      'from-emerald-400 to-teal-500',
      'from-amber-400 to-orange-500',
      'from-blue-400 to-cyan-500',
    ];
    const safeName = author?.name || 'User';
    const colorIdx = (safeName.charCodeAt(0) || 0) % colors.length;
    return (
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white bg-gradient-to-br ${colors[colorIdx]} shrink-0`}
      >
        {safeName.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <>
      <article
        className={`group/card relative transition-all duration-300 p-4 sm:p-6 ${
          dark
            ? 'bg-zinc-900/40 hover:bg-zinc-900/70 text-white'
            : 'bg-white hover:bg-zinc-50/80 text-zinc-900'
        } ${deleting ? 'opacity-40 pointer-events-none scale-[0.98]' : ''}`}
      >
        {/* Top Header: Avatar + Name + Group Pill + Follow Button + Options */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <button
              onClick={handleUserClick}
              className="focus:outline-none text-left shrink-0 relative group/avatar"
            >
              <div className="relative rounded-full p-0.5 transition-all duration-300 group-hover/avatar:ring-2 group-hover/avatar:ring-indigo-500/50">
                {getAvatar(post.author)}
              </div>
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleUserClick}
                  className={`text-[14.5px] font-bold hover:underline outline-none text-left transition-colors truncate ${
                    dark ? 'text-zinc-100 hover:text-indigo-400' : 'text-zinc-900 hover:text-indigo-600'
                  }`}
                >
                  {post.author?.name || 'User'}
                </button>

                {post.community && (
                  <button
                    onClick={() => router.push(`/community/groups/${post.community?.slug}`)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold transition-all duration-300 border ${
                      dark
                        ? 'bg-indigo-950/50 border-indigo-800/60 text-indigo-300 hover:bg-indigo-900/60 hover:border-indigo-700'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100/80 hover:border-indigo-300'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    <span>/{post.community.name}</span>
                  </button>
                )}

                {/* Follow pill */}
                {!isOwnPost && (
                  <button
                    onClick={handleFollowClick}
                    disabled={followLoading}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all duration-300 active:scale-95 ${
                      following
                        ? dark
                          ? 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10 hover:bg-rose-500/15 hover:text-rose-400 hover:border-rose-500/40'
                          : 'border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200'
                        : dark
                          ? 'border-zinc-700 text-zinc-400 hover:border-indigo-500/60 hover:text-indigo-300 hover:bg-indigo-500/10'
                          : 'border-zinc-300 text-zinc-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50'
                    } disabled:opacity-50 ml-auto sm:ml-0`}
                  >
                    {following ? <UserCheck size={11} /> : <UserPlus size={11} />}
                    <span>{following ? 'Following' : 'Follow'}</span>
                  </button>
                )}
              </div>

              <p className={`text-[11.5px] mt-0.5 font-medium ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {post.createdAt ? formatDistanceToNowStrict(new Date(post.createdAt), { addSuffix: true }) : 'just now'}
              </p>
            </div>
          </div>

          {/* Options Menu Dropdown */}
          {(isOwnPost || isModerator || isAdmin) && (
            <div className="relative shrink-0">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className={`p-1.5 rounded-xl transition-all duration-200 ${
                  dark
                    ? 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80'
                    : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div
                    className={`absolute right-0 top-full mt-1.5 z-50 w-40 rounded-xl border shadow-xl p-1.5 backdrop-blur-md transition-all duration-200 animate-in fade-in zoom-in-95 ${
                      dark ? 'bg-zinc-900/95 border-zinc-700/80 shadow-black/40' : 'bg-white/95 border-zinc-200 shadow-zinc-200/50'
                    }`}
                  >
                    {isOwnPost && (
                      <button
                        onClick={() => { setMenuOpen(false); setIsEditing(true); }}
                        className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                          dark ? 'text-zinc-200 hover:bg-zinc-800/80' : 'text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <Edit2 size={14} className="text-indigo-400" />
                        <span>Edit post</span>
                      </button>
                    )}
                    <button
                      onClick={() => { setMenuOpen(false); handleDelete(); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                      <span>Delete post</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Post content body */}
        {isEditing ? (
          <div className={`mt-2.5 p-3.5 rounded-xl border transition-all ${dark ? 'bg-zinc-950/80 border-indigo-500/40 ring-2 ring-indigo-500/20' : 'bg-zinc-50 border-indigo-300 ring-2 ring-indigo-500/10'}`}>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value.slice(0, 500))}
              className={`w-full resize-none text-[14.5px] leading-relaxed bg-transparent outline-none ${
                dark ? 'text-zinc-100 placeholder:text-zinc-600' : 'text-zinc-800 placeholder:text-zinc-400'
              }`}
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-2.5">
              <button
                onClick={() => { setIsEditing(false); setEditContent(currentPostContent); }}
                className={`text-[12.5px] font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  dark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={savingEdit || !editContent.trim()}
                className="flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all duration-200 active:scale-95"
              >
                {savingEdit ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={14} />}
                Save changes
              </button>
            </div>
          </div>
        ) : (
          currentPostContent && (
            <div className="mt-1">
              {renderFormattedContent(currentPostContent, dark)}
            </div>
          )
        )}

        {/* Media Grid Display */}
        {post.media && post.media.length > 0 && (
          <div className="mt-3.5">
            <CommunityMediaGrid media={post.media} />
          </div>
        )}

        {/* Interactive Action Bar */}
        <div className={`flex flex-wrap items-center justify-between gap-y-2 mt-4 pt-3.5 border-t transition-colors ${
          dark ? 'border-zinc-800/80' : 'border-zinc-100'
        }`}>
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            {/* Like Button */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-300 group/like active:scale-90 ${
                liked
                  ? 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/15 dark:text-rose-400'
                  : dark
                  ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10'
                  : 'text-zinc-500 hover:text-rose-500 hover:bg-rose-50'
              }`}
            >
              <Heart
                size={17}
                className={`transition-all duration-300 ${likeAnim ? 'scale-125' : 'group-hover/like:scale-110'} ${
                  liked ? 'fill-rose-500 text-rose-500' : 'fill-transparent'
                }`}
              />
              <span className="sm:hidden">{likeCount > 0 ? likeCount : ''}</span>
              <span className="hidden sm:inline">{likeCount > 0 ? likeCount : 'Like'}</span>
            </button>

            {/* Comment Button */}
            <button
              onClick={handleCommentToggle}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-300 group/comment active:scale-90 ${
                showComments
                  ? 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400'
                  : dark
                  ? 'text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10'
                  : 'text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              <MessageCircle
                size={17}
                className={`transition-transform duration-200 group-hover/comment:scale-110 ${
                  showComments ? 'fill-indigo-500/20' : 'fill-transparent'
                }`}
              />
              <span className="sm:hidden">{commentCount > 0 ? commentCount : ''}</span>
              <span className="hidden sm:inline">{commentCount > 0 ? commentCount : 'Comment'}</span>
            </button>
          </div>

          {/* Share Button */}
          <button
            onClick={() => {
              if (!currentUserId) {
                window.dispatchEvent(new CustomEvent('open-auth-modal'));
              } else {
                setShowShareModal(true);
              }
            }}
            className={`flex shrink-0 items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-300 group/share active:scale-90 ${
              dark
                ? 'text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                : 'text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            <Share2
              size={16}
              className="transition-transform duration-200 group-hover/share:scale-110"
            />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        {/* Comment Section Drawer */}
        {showComments && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <CommunityCommentSection
              postId={post.id}
              comments={[]}
              currentUserId={currentUserId}
              dark={dark}
              onCommentAdded={handleCommentAdded}
              onCommentDeleted={(count) => updatePostState(post.id, { commentCount: Math.max(0, commentCount - count) })}
              onUserClick={onUserClick}
            />
          </div>
        )}
      </article>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          postId={post.id}
          post={post}
          dark={dark}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}

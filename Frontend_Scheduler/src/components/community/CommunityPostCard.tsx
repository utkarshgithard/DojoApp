'use client';

import React, { useState } from 'react';
import API from '@/lib/axios';
import { Heart, MessageCircle, Trash2, MoreHorizontal, Share2, UserPlus, UserCheck } from 'lucide-react';
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
    if (post.followedByMe !== undefined && currentUserId && post.author.id !== currentUserId) {
      syncFollowState(post.author.id, post.followedByMe);
    }
  }, [post.id, post.likeCount, post.likedByMe, post.commentCount, post.followedByMe, post.author.id, currentUserId, syncPostState, syncFollowState]);

  const currentState = postStates[post.id] || {
    likeCount: post.likeCount,
    likedByMe: post.likedByMe,
    commentCount: post.commentCount,
  };

  const following = followStates[post.author.id] || false;
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
  const isOwnPost = post.author.id === currentUserId;
  const isAdmin = userDetails?.role === 'admin';

  const handleUserClick = () => {
    if (onUserClick) {
      onUserClick(post.author.id);
    } else {
      router.push(`/user/${post.author.id}`);
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
      await toggleFollow(post.author.id);
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

  const handleCommentToggle = () => setShowComments((v) => !v);
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
        className={`transition-all duration-200 p-4 md:p-5 ${
          dark
            ? 'bg-zinc-900/10 hover:bg-zinc-900/30 text-white'
            : 'bg-white hover:bg-zinc-50/50 text-zinc-900'
        } ${deleting ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {/* Header: Avatar + Name + Timestamp + Follow + Menu */}
        <div className="flex items-start gap-3 mb-3">
          <button onClick={handleUserClick} className="focus:outline-none text-left shrink-0">
            {getAvatar(post.author)}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handleUserClick}
                className={`text-[14px] font-semibold hover:underline outline-none text-left transition-colors ${
                  dark ? 'text-white' : 'text-zinc-900'
                }`}
              >
                {post.author?.name || 'User'}
              </button>

              {post.community && (
                <>
                  <span className={`text-[13px] ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    posted in the
                  </span>
                  <button
                    onClick={() => router.push(`/community/groups/${post.community?.slug}`)}
                    className="text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline outline-none text-left transition-colors"
                  >
                    /{post.community.name}
                  </button>
                </>
              )}

              {/* Follow pill — only for other users' posts */}
              {!isOwnPost && (
                <button
                  onClick={handleFollowClick}
                  disabled={followLoading}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                    following
                      ? dark
                        ? 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40'
                        : 'border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                      : dark
                        ? 'border-zinc-700 text-zinc-400 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/10'
                        : 'border-zinc-300 text-zinc-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50'
                  } disabled:opacity-50`}
                >
                  {following ? <UserCheck size={10} /> : <UserPlus size={10} />}
                  {following ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
            <p className={`text-[11.5px] mt-0.5 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {post.createdAt ? formatDistanceToNowStrict(new Date(post.createdAt), { addSuffix: true }) : 'just now'}
            </p>
          </div>

          {/* Options menu — own posts, moderator, or site admin */}
          {(isOwnPost || isModerator || isAdmin) && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-zinc-500 hover:text-white hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'}`}
              >
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div
                    className={`absolute right-0 top-full mt-1 z-50 w-36 rounded-lg border shadow-xl p-1 ${
                      dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
                    }`}
                  >
                    {isOwnPost && (
                      <button
                        onClick={() => { setMenuOpen(false); setIsEditing(true); }}
                        className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                          dark ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <Edit2 size={13} />
                        <span>Edit post</span>
                      </button>
                    )}
                    <button
                      onClick={() => { setMenuOpen(false); handleDelete(); }}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-red-500 hover:bg-red-500/5 transition-colors"
                    >
                      <Trash2 size={13} />
                      <span>Delete post</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Post content */}
        {isEditing ? (
          <div className={`mt-2 p-3 rounded-lg border ${dark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value.slice(0, 500))}
              className={`w-full resize-none text-[14px] leading-relaxed bg-transparent outline-none ${
                dark ? 'text-zinc-200 placeholder:text-zinc-600' : 'text-zinc-800 placeholder:text-zinc-400'
              }`}
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => { setIsEditing(false); setEditContent(currentPostContent); }}
                className={`text-[12px] font-medium px-3 py-1.5 rounded-md transition-colors ${
                  dark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={savingEdit || !editContent.trim()}
                className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
              >
                {savingEdit ? <span className="w-3 h-3 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" /> : <Save size={13} />}
                Save
              </button>
            </div>
          </div>
        ) : (
          currentPostContent && (
            <p className={`text-[14px] leading-relaxed whitespace-pre-wrap break-words ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              {currentPostContent}
            </p>
          )
        )}

        {/* Media Grid */}
        {post.media && post.media.length > 0 && (
          <CommunityMediaGrid media={post.media} />
        )}

        {/* Action bar */}
        <div className={`flex items-center gap-4 mt-4 pt-3 border-t ${dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-[13px] font-medium transition-all duration-200 group ${
              liked ? 'text-red-500' : dark ? 'text-zinc-500 hover:text-red-400' : 'text-zinc-500 hover:text-red-500'
            }`}
          >
            <Heart
              size={17}
              className={`transition-transform duration-200 ${likeAnim ? 'scale-125' : 'scale-100'} ${liked ? 'fill-red-500' : 'fill-transparent group-hover:scale-110'}`}
            />
            <span>{likeCount > 0 ? likeCount : ''}</span>
          </button>

          {/* Comment toggle */}
          <button
            onClick={handleCommentToggle}
            className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors group ${
              showComments
                ? 'text-indigo-500'
                : dark ? 'text-zinc-500 hover:text-indigo-400' : 'text-zinc-500 hover:text-indigo-500'
            }`}
          >
            <MessageCircle
              size={17}
              className={`transition-transform duration-150 group-hover:scale-110 ${showComments ? 'fill-indigo-500/20' : 'fill-transparent'}`}
            />
            <span>{commentCount > 0 ? commentCount : ''}</span>
          </button>

          {/* Share */}
          <button
            onClick={() => {
              if (!currentUserId) {
                window.dispatchEvent(new CustomEvent('open-auth-modal'));
              } else {
                setShowShareModal(true);
              }
            }}
            className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors group ${
              dark ? 'text-zinc-500 hover:text-emerald-400' : 'text-zinc-400 hover:text-emerald-600'
            }`}
          >
            <Share2
              size={15}
              className="transition-transform duration-150 group-hover:scale-110"
            />
            <span className="text-[12px]">Share</span>
          </button>
        </div>

        {/* Comments */}
        {showComments && (
          <CommunityCommentSection
            postId={post.id}
            comments={[]}
            currentUserId={currentUserId}
            dark={dark}
            onCommentAdded={handleCommentAdded}
            onCommentDeleted={(count) => updatePostState(post.id, { commentCount: Math.max(0, commentCount - count) })}
            onUserClick={onUserClick}
          />
        )}
      </article>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          postId={post.id}
          dark={dark}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}

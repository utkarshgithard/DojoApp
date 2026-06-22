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
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(defaultShowComments ?? false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [following, setFollowing] = useState(post.followedByMe ?? false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const router = useRouter();
  const isOwnPost = post.author.id === currentUserId;

  const handleUserClick = () => {
    if (onUserClick) {
      onUserClick(post.author.id);
    } else {
      router.push(`/user/${post.author.id}`);
    }
  };

  const handleLike = async () => {
    if (!currentUserId) {
      router.push('/login');
      return;
    }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 300);
    try {
      await API.post(`/community/posts/${post.id}/like`);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
    }
  };

  const handleFollow = async () => {
    if (!currentUserId) {
      router.push('/login');
      return;
    }
    if (followLoading) return;
    setFollowLoading(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing); // optimistic
    try {
      await API.post(`/community/users/${post.author.id}/follow`);
    } catch {
      setFollowing(wasFollowing); // revert on error
    } finally {
      setFollowLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      if (post.community?.slug && post.author.id !== currentUserId) {
        await API.delete(`/groups/${post.community.slug}/posts/${post.id}`);
      } else {
        await API.delete(`/community/posts/${post.id}`);
      }
      onDelete?.(post.id);
    } catch {
      setDeleting(false);
    }
  };

  const handleCommentToggle = () => setShowComments((v) => !v);
  const handleCommentAdded = () => setCommentCount((c) => c + 1);

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
    const colorIdx = author.name.charCodeAt(0) % colors.length;
    return (
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white bg-gradient-to-br ${colors[colorIdx]} shrink-0`}
      >
        {author.name.charAt(0).toUpperCase()}
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
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleUserClick}
                className={`text-[14px] font-semibold hover:underline outline-none text-left transition-colors ${
                  dark ? 'text-white' : 'text-zinc-900'
                }`}
              >
                {post.author.name}
              </button>

              {/* Follow pill — only for other users' posts */}
              {!isOwnPost && (
                <button
                  onClick={handleFollow}
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
              {formatDistanceToNowStrict(new Date(post.createdAt), { addSuffix: true })}
            </p>
          </div>

          {/* Options menu (delete) — own posts or moderator */}
          {(isOwnPost || isModerator) && (
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
        {post.content && (
          <p className={`text-[14px] leading-relaxed whitespace-pre-wrap break-words ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            {post.content}
          </p>
        )}

        {/* Media */}
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
                router.push('/login');
              } else {
                setShowShareModal(true);
              }
            }}
            className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors group ml-auto ${
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
            onCommentDeleted={(count) => setCommentCount((c) => Math.max(0, c - count))}
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

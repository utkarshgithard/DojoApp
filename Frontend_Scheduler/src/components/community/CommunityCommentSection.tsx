'use client';

import React, { useState, useRef, useEffect } from 'react';
import API from '@/lib/axios';
import { Send, Trash2, X, Edit2, Save, MessageCircle } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/authContext';
import { toast } from 'sonner';
import useSWR, { preload } from 'swr';

const COMMENTS_LIMIT = 10;
const commentsKey = (postId: string) => `/community/posts/${postId}/comments?limit=${COMMENTS_LIMIT}`;
const fetchComments = async (url: string) => (await API.get(url)).data;

export const prefetchComments = (postId: string) => {
  preload(commentsKey(postId), fetchComments);
};

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  parentId?: string | null;
  author: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

interface CommunityCommentSectionProps {
  postId: string;
  comments: Comment[];
  currentUserId: string;
  dark: boolean;
  onCommentAdded?: () => void;
  onCommentDeleted?: (count: number) => void;
  onUserClick?: (userId: string) => void;
}

export default function CommunityCommentSection({
  postId,
  comments: initialComments,
  currentUserId,
  dark,
  onCommentAdded,
  onCommentDeleted,
  onUserClick,
}: CommunityCommentSectionProps) {
  const { userDetails } = useAuth() as any;
  const { data, mutate, isValidating } = useSWR<{ comments: Comment[]; nextCursor: string | null }>(
    commentsKey(postId),
    fetchComments,
    {
      fallbackData: initialComments.length > 0 ? { comments: initialComments, nextCursor: null } : undefined,
      revalidateOnMount: true,
    },
  );
  const [additionalComments, setAdditionalComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(initialComments.length === 0 && !data);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string; parentId: string } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const comments = [...(data?.comments || []), ...additionalComments].filter(
    (comment, index, all) => all.findIndex((item) => item.id === comment.id) === index,
  );

  const handleUserClick = (authorId: string) => {
    if (onUserClick) {
      onUserClick(authorId);
    } else {
      router.push(`/user/${authorId}`);
    }
  };

  useEffect(() => {
    setLoadingComments(!data && initialComments.length === 0);
    if (data) setNextCursor(data.nextCursor || null);
  }, [data, initialComments.length]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchComments(`${commentsKey(postId)}&cursor=${encodeURIComponent(nextCursor)}`);
      
      // Because we sort ascending, new (older) comments fetched from cursor should be prepended
      // so they appear at the top, since they are older than what we currently have on screen.
      // Wait, let's verify. We fetched top-level `desc` (newest first). 
      // If we page through it, we get older and older comments.
      // The API returns the chunk sorted `asc` (oldest in the chunk first, newest in the chunk last).
      // So if we prepend the new chunk, the very oldest comments will be at the very top.
      setAdditionalComments((prev) => {
        const existingIds = new Set([...comments, ...prev].map(c => c.id));
        const newComments = page.comments.filter((c: Comment) => !existingIds.has(c.id));
        const combined = [...prev, ...newComments];
        combined.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return combined;
      });
      setNextCursor(page.nextCursor || null);
    } catch {
      toast.error('Failed to load more comments');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const parentId = replyingTo?.parentId || null;
      const { data: response } = await API.post(`/community/posts/${postId}/comments`, {
        content: text.trim(),
        parentId
      });
      const newComment = response.comment as Comment;
      await mutate((current) => ({
        comments: [...(current?.comments || []), newComment],
        nextCursor: current?.nextCursor || null,
      }), false);
      setText('');
      setReplyingTo(null);
      onCommentAdded?.();
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await API.delete(`/community/comments/${commentId}`);
      
      const commentToDelete = comments.find((c) => c.id === commentId);
      let countDeleted = 1;
      
      if (commentToDelete && !commentToDelete.parentId) {
        // Deleting top-level comment means all of its replies are cascade deleted
        const repliesToDelete = comments.filter((c) => c.parentId === commentId);
        countDeleted += repliesToDelete.length;
        await mutate((current) => ({
          comments: (current?.comments || []).filter((c) => c.id !== commentId && c.parentId !== commentId),
          nextCursor: current?.nextCursor || null,
        }), false);
        setAdditionalComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
      } else {
        await mutate((current) => ({
          comments: (current?.comments || []).filter((c) => c.id !== commentId),
          nextCursor: current?.nextCursor || null,
        }), false);
        setAdditionalComments((prev) => prev.filter((c) => c.id !== commentId));
      }
      
      onCommentDeleted?.(countDeleted);
      toast.success('Comment deleted successfully');
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const handleEditSave = async (commentId: string) => {
    if (!editCommentText.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      const { data } = await API.put(`/community/comments/${commentId}`, { content: editCommentText.trim() });
      await mutate((current) => ({
        comments: (current?.comments || []).map((c) => c.id === commentId ? { ...c, content: data.comment.content } : c),
        nextCursor: current?.nextCursor || null,
      }), false);
      setAdditionalComments((prev) => prev.map((c) => c.id === commentId ? { ...c, content: data.comment.content } : c));
      setEditingCommentId(null);
      setEditCommentText('');
      toast.success('Comment edited successfully');
    } catch {
      toast.error('Failed to edit comment');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleReplyClick = (comment: Comment) => {
    const parentId = comment.parentId || comment.id;
    setReplyingTo({
      id: comment.id,
      name: comment.author.name,
      parentId,
    });
    
    if (comment.parentId) {
      setText(`@${comment.author.name} `);
    } else {
      setText('');
    }
    
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const getAvatar = (name: string, avatarUrl?: string | null, sizeClass = 'w-7 h-7', authorId?: string) => {
    let avatarToRender = avatarUrl;
    if (authorId === currentUserId) {
      avatarToRender = userDetails?.avatarUrl || avatarUrl || auth.currentUser?.photoURL || null;
    }
    if (avatarToRender) {
      return (
        <img
          src={avatarToRender}
          alt={name}
          referrerPolicy="no-referrer"
          className={`${sizeClass} rounded-full object-cover shrink-0`}
        />
      );
    }
    const textSz = sizeClass.includes('w-6') ? 'text-[10px]' : 'text-[11px]';
    return (
      <div className={`${sizeClass} rounded-full flex items-center justify-center font-bold shrink-0 ${dark ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-200 text-zinc-700'} ${textSz}`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  const renderCommentContent = (content: string) => {
    if (!content.startsWith('@')) return content;
    const spaceIndex = content.indexOf(' ');
    if (spaceIndex === -1) return content;
    const mention = content.slice(0, spaceIndex);
    const rest = content.slice(spaceIndex);
    return (
      <>
        <span className="font-semibold text-indigo-600 dark:text-indigo-400 mr-1">
          {mention}
        </span>
        {rest}
      </>
    );
  };

  const topLevelComments = comments.filter((c) => !c.parentId);
  const replies = comments.filter((c) => c.parentId);

  return (
    <div className={`mt-4 overflow-hidden rounded-2xl border ${
      dark ? 'border-zinc-800/80 bg-zinc-950/30' : 'border-zinc-200/80 bg-zinc-50/50'
    }`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        dark ? 'border-zinc-800/80' : 'border-zinc-200/80'
      }`}>
        <div>
          <h3 className={`text-sm font-bold ${dark ? 'text-zinc-100' : 'text-zinc-900'}`}>Comments</h3>
          <p className={`text-[11px] mt-0.5 ${dark ? 'text-zinc-500' : 'text-zinc-500'}`}>
            {comments.length ? `${comments.length} ${comments.length === 1 ? 'thought' : 'thoughts'}` : 'Join the conversation'}
          </p>
        </div>
        {isValidating && (
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium ${
            dark ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Updating
          </span>
        )}
      </div>

      {/* Comment list */}
      <div className="space-y-4 px-4 py-4">
        {loadingComments ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex gap-2.5 animate-pulse">
                <span className={`h-8 w-8 shrink-0 rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                <div className="flex-1 space-y-2">
                  <span className={`block h-3 w-24 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                  <span className={`block h-10 w-full rounded-2xl ${dark ? 'bg-zinc-900' : 'bg-zinc-100'}`} />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className={`rounded-xl border border-dashed px-4 py-7 text-center ${
            dark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'
          }`}>
            <MessageCircle className="mx-auto mb-2 h-5 w-5 opacity-60" />
            <p className="text-sm font-medium">No comments yet</p>
            <p className="mt-1 text-[11px]">Be the first to share your thoughts.</p>
          </div>
        ) : (
          <>
            {nextCursor && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className={`text-[11px] font-semibold px-4 py-2 rounded-full border transition-all hover:-translate-y-0.5 ${
                    dark 
                      ? 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-50'
                  }`}
                >
                  {loadingMore ? 'Loading...' : 'View previous comments'}
                </button>
              </div>
            )}
            {topLevelComments.map((c) => {
            const commentReplies = replies.filter((r) => r.parentId === c.id);
            return (
              <div key={c.id} className="space-y-3">
                {/* Top level comment */}
                <div className="flex gap-2 group">
                  <button onClick={() => handleUserClick(c.author.id)} className="focus:outline-none text-left shrink-0">
                    {getAvatar(c.author.name, c.author.avatarUrl, 'w-7 h-7', c.author.id)}
                  </button>
                  <div className={`flex-1 min-w-0 rounded-2xl px-3 py-2 ${
                    dark ? 'bg-zinc-900/80' : 'bg-white shadow-sm shadow-zinc-200/40'
                  }`}>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleUserClick(c.author.id)} 
                        className={`text-[12px] font-semibold hover:underline outline-none text-left transition-colors ${
                          dark ? 'text-zinc-200' : 'text-zinc-800'
                        }`}
                      >
                        {c.author.name}
                      </button>
                      <span className={`text-[10px] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {formatDistanceToNowStrict(new Date(c.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {editingCommentId === c.id ? (
                      <div className="mt-1 flex flex-col gap-2">
                        <textarea
                          value={editCommentText}
                          onChange={(e) => setEditCommentText(e.target.value.slice(0, 300))}
                          className={`w-full text-[13px] rounded-lg border p-2 resize-none outline-none ${
                            dark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                          }`}
                          rows={2}
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingCommentId(null)}
                            className={`text-[11px] font-medium px-2 py-1 rounded transition-colors ${dark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-200'}`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleEditSave(c.id)}
                            disabled={savingEdit || !editCommentText.trim()}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded bg-indigo-600 text-white disabled:opacity-50"
                          >
                            {savingEdit ? <span className="w-3 h-3 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" /> : <Save size={12} />}
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className={`text-[13px] leading-relaxed mt-1 ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          {c.content}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => {
                              if (!currentUserId) {
                                window.dispatchEvent(new CustomEvent('open-auth-modal'));
                              } else {
                                handleReplyClick(c);
                              }
                            }}
                            className={`text-[11px] font-medium transition-colors ${
                              dark ? 'text-zinc-500 hover:text-indigo-400' : 'text-zinc-400 hover:text-indigo-600'
                            }`}
                          >
                            Reply
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Delete / Edit buttons */}
                  {c.author.id === currentUserId && !editingCommentId && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center transition-all self-start">
                      <button
                        onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.content); }}
                        className="p-1 rounded transition-colors text-zinc-400 hover:text-indigo-500"
                        title="Edit comment"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1 rounded transition-colors text-zinc-400 hover:text-red-500"
                        title="Delete comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Nested replies list */}
                {commentReplies.length > 0 && (
                  <div className="pl-9 space-y-3 relative">
                    {/* Thread connection line */}
                    <div 
                      className={`absolute left-3.5 top-0 bottom-3.5 w-0.5 ${
                        dark ? 'bg-zinc-800' : 'bg-zinc-200'
                      }`}
                      style={{ top: '-4px' }}
                    />
                    
                    {commentReplies.map((reply) => (
                      <div key={reply.id} className="flex gap-2 group relative">
                        {/* Thread line branch curve */}
                        <div 
                          className={`absolute top-[12px] h-0.5 ${
                            dark ? 'bg-zinc-800' : 'bg-zinc-200'
                          }`}
                          style={{ left: '-22px', width: '22px' }}
                        />
                        
                        <button onClick={() => handleUserClick(reply.author.id)} className="focus:outline-none text-left shrink-0">
                          {getAvatar(reply.author.name, reply.author.avatarUrl, 'w-6 h-6', reply.author.id)}
                        </button>
                        
                        <div className={`flex-1 min-w-0 rounded-2xl px-3 py-2 ${
                          dark ? 'bg-zinc-900/60' : 'bg-white/80'
                        }`}>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleUserClick(reply.author.id)} 
                              className={`text-[12px] font-semibold hover:underline outline-none text-left transition-colors ${
                                dark ? 'text-zinc-200' : 'text-zinc-800'
                              }`}
                            >
                              {reply.author.name}
                            </button>
                            <span className={`text-[10px] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                              {formatDistanceToNowStrict(new Date(reply.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          {editingCommentId === reply.id ? (
                            <div className="mt-1 flex flex-col gap-2">
                              <textarea
                                value={editCommentText}
                                onChange={(e) => setEditCommentText(e.target.value.slice(0, 300))}
                                className={`w-full text-[13px] rounded-lg border p-2 resize-none outline-none ${
                                  dark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                                }`}
                                rows={2}
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setEditingCommentId(null)}
                                  className={`text-[11px] font-medium px-2 py-1 rounded transition-colors ${dark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-200'}`}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleEditSave(reply.id)}
                                  disabled={savingEdit || !editCommentText.trim()}
                                  className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded bg-indigo-600 text-white disabled:opacity-50"
                                >
                                  {savingEdit ? <span className="w-3 h-3 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" /> : <Save size={12} />}
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className={`text-[13px] leading-relaxed mt-0.5 ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                {renderCommentContent(reply.content)}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <button
                                  onClick={() => {
                                    if (!currentUserId) {
                                      window.dispatchEvent(new CustomEvent('open-auth-modal'));
                                    } else {
                                      handleReplyClick(reply);
                                    }
                                  }}
                                  className={`text-[11px] font-medium transition-colors ${
                                    dark ? 'text-zinc-500 hover:text-indigo-400' : 'text-zinc-400 hover:text-indigo-600'
                                  }`}
                                >
                                  Reply
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Delete / Edit reply button */}
                        {reply.author.id === currentUserId && !editingCommentId && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center transition-all self-start">
                            <button
                              onClick={() => { setEditingCommentId(reply.id); setEditCommentText(reply.content); }}
                              className="p-1 rounded transition-colors text-zinc-400 hover:text-indigo-500"
                              title="Edit reply"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(reply.id)}
                              className="p-1 rounded transition-colors text-zinc-400 hover:text-red-500"
                              title="Delete reply"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          </>
        )}
      </div>

      {/* Comment input area */}
      {!currentUserId ? (
        <div className={`border-t px-4 py-4 text-center text-[13px] ${
          dark ? 'bg-zinc-900/50 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500'
        }`}>
          Please <button onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))} className="text-indigo-500 hover:underline font-semibold">log in</button> or <button onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))} className="text-indigo-500 hover:underline font-semibold">sign up</button> to write comments or replies.
        </div>
      ) : (
        <div className={`border-t px-4 py-3 ${dark ? 'border-zinc-800/80' : 'border-zinc-200/80'}`}>
          {replyingTo && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-t-2xl text-[11px] border-x border-t
              ${dark 
                ? 'bg-zinc-900/50 border-zinc-700 text-zinc-300' 
                : 'bg-zinc-100 border-zinc-200 text-zinc-600'
              }`}
            >
              <span>
                Replying to <span className="font-semibold text-indigo-500">@{replyingTo.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-zinc-400 hover:text-zinc-600 p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 300))}
              onKeyDown={handleKey}
              rows={1}
              placeholder={replyingTo ? "Write a reply…" : "Write a comment… (Enter to send)"}
              className={`flex-1 resize-none text-[13px] leading-relaxed rounded-2xl px-3.5 py-2.5 border outline-none transition-all
                ${replyingTo ? 'rounded-t-none' : ''}
                ${dark
                  ? 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15'
                  : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15'
                }`}
              style={{ minHeight: '38px', maxHeight: '100px', overflow: 'auto' }}
            />
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="shrink-0 w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              {submitting
                ? <span className="w-3.5 h-3.5 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" />
                : <Send size={14} />
              }
            </button>
          </form>
        </div>
      )}

      {text.length > 0 && (
        <p className={`text-[10px] mt-1 text-right ${text.length > 280 ? 'text-orange-400' : dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
          {text.length}/300
        </p>
      )}
    </div>
  );
}

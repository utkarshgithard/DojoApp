'use client';

import React, { useState, useRef, useEffect } from 'react';
import API from '@/lib/axios';
import { Send, Trash2, X } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/authContext';



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
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(initialComments.length === 0);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string; parentId: string } | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const handleUserClick = (authorId: string) => {
    if (onUserClick) {
      onUserClick(authorId);
    } else {
      router.push(`/user/${authorId}`);
    }
  };

  // Fetch comments when first opened
  useEffect(() => {
    if (initialComments.length > 0) return; // already seeded
    API.get(`/community/posts/${postId}/comments`)
      .then(({ data }) => setComments(data.comments || []))
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [postId, initialComments.length]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const parentId = replyingTo?.parentId || null;
      const { data } = await API.post(`/community/posts/${postId}/comments`, { 
        content: text.trim(),
        parentId
      });
      setComments((prev) => [...prev, data.comment]);
      setText('');
      setReplyingTo(null);
      onCommentAdded?.();
    } catch {
      // silent fail
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
        setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
      
      onCommentDeleted?.(countDeleted);
    } catch {
      // silent
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
    <div className={`mt-3 pt-3 border-t ${dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
      {/* Comment list */}
      <div className="space-y-4 mb-3">
        {loadingComments ? (
          <div className="flex items-center gap-2 py-2">
            <span className={`w-4 h-4 border-[1.5px] border-current border-t-transparent rounded-full animate-spin ${dark ? 'text-zinc-600' : 'text-zinc-300'}`} />
            <span className={`text-[12px] ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>Loading comments…</span>
          </div>
        ) : comments.length === 0 ? (
          <p className={`text-[12px] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>No comments yet. Be the first!</p>
        ) : (
          topLevelComments.map((c) => {
            const commentReplies = replies.filter((r) => r.parentId === c.id);
            return (
              <div key={c.id} className="space-y-3">
                {/* Top level comment */}
                <div className="flex gap-2 group">
                  <button onClick={() => handleUserClick(c.author.id)} className="focus:outline-none text-left shrink-0">
                    {getAvatar(c.author.name, c.author.avatarUrl, 'w-7 h-7', c.author.id)}
                  </button>
                  <div className="flex-1 min-w-0">
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
                    <p className={`text-[13px] leading-relaxed mt-0.5 ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      {c.content}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => handleReplyClick(c)}
                        className={`text-[11px] font-medium transition-colors ${
                          dark ? 'text-zinc-500 hover:text-indigo-400' : 'text-zinc-400 hover:text-indigo-600'
                        }`}
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                  {/* Delete button */}
                  {c.author.id === currentUserId && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all text-zinc-400 hover:text-red-500 shrink-0 self-start"
                      title="Delete comment"
                    >
                      <Trash2 size={13} />
                    </button>
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
                        
                        <div className="flex-1 min-w-0">
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
                          <p className={`text-[13px] leading-relaxed mt-0.5 ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            {renderCommentContent(reply.content)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => {
                                if (!currentUserId) {
                                  router.push('/login');
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
                        </div>
                        
                        {/* Delete reply button */}
                        {reply.author.id === currentUserId && (
                          <button
                            onClick={() => handleDelete(reply.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all text-zinc-400 hover:text-red-500 shrink-0 self-start"
                            title="Delete reply"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Comment input area */}
      {!currentUserId ? (
        <div className={`mt-3 p-4 rounded-xl border text-center text-[13px] ${
          dark ? 'bg-zinc-900/50 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500'
        }`}>
          Please <button onClick={() => router.push('/login')} className="text-indigo-500 hover:underline font-semibold">log in</button> or <button onClick={() => router.push('/register')} className="text-indigo-500 hover:underline font-semibold">sign up</button> to write comments or replies.
        </div>
      ) : (
        <div className="flex flex-col mt-2">
          {replyingTo && (
            <div className={`flex items-center justify-between px-3 py-1.5 rounded-t-xl text-[11.5px] border-x border-t
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
              className={`flex-1 resize-none text-[13px] leading-relaxed rounded-xl px-3 py-2.5 border outline-none transition-colors
                ${replyingTo ? 'rounded-t-none' : ''}
                ${dark
                  ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-zinc-500'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400'
                }`}
              style={{ minHeight: '38px', maxHeight: '100px', overflow: 'auto' }}
            />
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="shrink-0 w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition-all active:scale-95"
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

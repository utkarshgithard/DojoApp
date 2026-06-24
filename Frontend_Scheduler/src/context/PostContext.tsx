"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';

export interface PostInteractionState {
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
}

interface PostContextType {
  postStates: Record<string, PostInteractionState>;
  syncPostState: (postId: string, state: PostInteractionState) => void;
  updatePostState: (postId: string, updates: Partial<PostInteractionState>) => void;
}

const PostContext = createContext<PostContextType | undefined>(undefined);

export const PostProvider = ({ children }: { children: React.ReactNode }) => {
  const [postStates, setPostStates] = useState<Record<string, PostInteractionState>>({});
  const socketContext = useSocket();
  const socket = socketContext?.socket;

  const syncPostState = useCallback((postId: string, state: PostInteractionState) => {
    setPostStates((prev) => {
      // Only sync if we don't have it yet to avoid overriding global optimistic updates 
      // with older prop data when re-rendering components.
      if (!prev[postId]) {
        return { ...prev, [postId]: state };
      }
      return prev;
    });
  }, []);

  const updatePostState = useCallback((postId: string, updates: Partial<PostInteractionState>) => {
    setPostStates((prev) => {
      const currentState = prev[postId] || { likeCount: 0, likedByMe: false, commentCount: 0 };
      return {
        ...prev,
        [postId]: {
          ...currentState,
          ...updates
        }
      };
    });
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleInteraction = (data: { postId: string, likeCount?: number, commentCount?: number }) => {
      setPostStates((prev) => {
        const existing = prev[data.postId];
        if (!existing) return prev;
        
        return {
          ...prev,
          [data.postId]: {
            ...existing,
            ...(data.likeCount !== undefined && { likeCount: data.likeCount }),
            ...(data.commentCount !== undefined && { commentCount: data.commentCount }),
          }
        };
      });
    };

    socket.on('post_interaction', handleInteraction);
    return () => {
      socket.off('post_interaction', handleInteraction);
    };
  }, [socket]);

  return (
    <PostContext.Provider value={{ postStates, syncPostState, updatePostState }}>
      {children}
    </PostContext.Provider>
  );
};

export const usePostContext = () => {
  const context = useContext(PostContext);
  if (context === undefined) {
    throw new Error('usePostContext must be used within a PostProvider');
  }
  return context;
};

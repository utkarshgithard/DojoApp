'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/authContext';
import { useDarkMode } from '@/context/DarkModeContext';
import API from '@/lib/axios';
import CommunityPostCard from '@/components/community/CommunityPostCard';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function PostDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id: postId } = use(params);
  const { isAuthenticated, loading: authLoading, userId } = useAuth() as any;
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await API.get(`/community/posts/${postId}`);
        setPost(res.data.post);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && isAuthenticated) {
      fetchPost();
    }
  }, [postId, isAuthenticated, authLoading]);

  const handlePostDeleted = () => {
    router.push('/community');
  };

  if (authLoading || (loading && !post)) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${dark ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f5]'}`}>
        <Loader2 size={24} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 pt-[96px] md:pt-[24px] pb-16 ${dark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-zinc-900'}`}>
      <div className="max-w-[720px] w-full mx-auto px-4">
        {/* Header bar */}
        <div className={`sticky top-0 z-20 -mx-4 px-4 py-4 mb-6 backdrop-blur-md border-b flex items-center justify-between ${
          dark ? 'bg-[#0a0a0a]/80 border-zinc-900' : 'bg-[#f5f5f5]/80 border-zinc-200/60'
        }`}>
          <button
            onClick={() => router.push('/community')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-[13px] font-semibold transition-all ${
              dark
                ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-900'
                : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <ArrowLeft size={14} />
            <span>Back to Community</span>
          </button>
          
          <div className="flex items-center gap-2 text-indigo-500">
            <MessageSquare size={16} />
            <span className="text-[13px] font-bold">Post Discussion</span>
          </div>
        </div>

        {error ? (
          <div className={`rounded-xl border p-8 text-center ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <p className={`text-[14px] mb-4 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>{error}</p>
            <button
              onClick={() => router.push('/community')}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-medium transition-all"
            >
              Back to Community
            </button>
          </div>
        ) : post ? (
          <div className="space-y-4">
            <CommunityPostCard
              post={post}
              currentUserId={userId}
              dark={dark}
              onDelete={handlePostDeleted}
              defaultShowComments={true}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

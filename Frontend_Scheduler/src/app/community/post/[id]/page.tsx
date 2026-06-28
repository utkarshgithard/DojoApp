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

    if (!authLoading) {
      fetchPost();
    }
  }, [postId, authLoading]);

  const handlePostDeleted = () => {
    router.push('/community');
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 pt-[45px] md:pt-[12px] pb-16 ${dark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-zinc-900'}`}>
      <div className="max-w-[720px] w-full mx-auto px-4">
        {/* Header bar */}
        <div className={`sticky top-0 z-20 -mx-4 px-4 py-4 mb-6 backdrop-blur-md border-b flex items-center justify-between ${dark ? 'bg-[#0a0a0a]/80 border-zinc-900' : 'bg-[#f5f5f5]/80 border-zinc-200/60'
          }`}>
          <button
            onClick={() => router.back()}
            className={`p-2 rounded-lg border transition-all ${dark
              ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-900'
              : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            title="Go back"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-2 text-indigo-500">
            <MessageSquare size={16} />
            <span className="text-[13px] font-bold">Discussion</span>
          </div>
        </div>

        {authLoading || (loading && !post) ? (
          <div className="space-y-4">
            {/* Post Card Skeleton */}
            <div className={`rounded-2xl border p-5 space-y-4 animate-pulse ${dark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-white border-zinc-200'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-3.5 w-1/4 rounded-lg ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                  <div className={`h-2.5 w-12 rounded-lg ${dark ? 'bg-zinc-850' : 'bg-zinc-250'}`} />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <div className={`h-3.5 w-full rounded-lg ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                <div className={`h-3.5 w-5/6 rounded-lg ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                <div className={`h-3.5 w-2/3 rounded-lg ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
              </div>
              <div className={`flex items-center gap-6 pt-4 border-t ${dark ? 'border-zinc-900' : 'border-zinc-100'}`}>
                <div className={`h-3.5 w-12 rounded-lg ${dark ? 'bg-zinc-850' : 'bg-zinc-200'}`} />
                <div className={`h-3.5 w-16 rounded-lg ${dark ? 'bg-zinc-850' : 'bg-zinc-200'}`} />
              </div>
            </div>

            {/* Comments Skeleton */}
            <div className={`rounded-2xl border p-5 space-y-4 animate-pulse ${dark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-white border-zinc-200'
              }`}>
              <div className={`h-3.5 w-24 rounded-lg mb-4 ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
              {[1, 2].map((i) => (
                <div key={i} className="flex items-start gap-3 pt-3">
                  <div className={`w-8 h-8 rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-20 rounded-lg ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                      <div className={`h-2.5 w-8 rounded-lg ${dark ? 'bg-zinc-850' : 'bg-zinc-250'}`} />
                    </div>
                    <div className={`h-3 w-5/6 rounded-lg ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
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
            <div className={`rounded-2xl border overflow-hidden shadow-sm ${dark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-white border-zinc-200'
              }`}>
              <CommunityPostCard
                post={post}
                currentUserId={userId}
                dark={dark}
                onDelete={handlePostDeleted}
                defaultShowComments={true}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

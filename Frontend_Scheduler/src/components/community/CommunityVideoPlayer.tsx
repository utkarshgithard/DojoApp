'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  thumbnailUrl?: string | null;
  className?: string;
}

export default function CommunityVideoPlayer({ src, thumbnailUrl, className = '' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { 
      v.play(); 
      v.muted = false; // Auto-unmute when playing
      setMuted(false);
      setPlaying(true); 
    }
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    videoRef.current?.requestFullscreen?.();
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && !v.paused) {
            v.pause();
            setPlaying(false);
          }
        });
      },
      { threshold: 0.1 } // Pause when less than 10% of the video is visible
    );

    observer.observe(v);

    return () => {
      observer.unobserve(v);
    };
  }, []);

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-black cursor-pointer group ${className}`}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        poster={thumbnailUrl ?? undefined}
        muted
        playsInline
        loop
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
        className="w-full max-h-[420px] object-contain"
      />

      {/* Play/Pause overlay */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
        <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
          {playing ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white ml-0.5" />}
        </div>
      </div>

      {/* Bottom controls bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Progress bar */}
        <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <button onClick={toggleMute} className="text-white hover:text-white/80 transition-colors">
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        <button onClick={handleFullscreen} className="text-white hover:text-white/80 transition-colors">
          <Maximize size={14} />
        </button>
      </div>
    </div>
  );
}

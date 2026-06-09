import React, { useEffect, useRef, useState } from 'react';
import { MicOff, User } from 'lucide-react';

interface RemoteVideoProps {
  stream: MediaStream;
  peerName: string;
  dark?: boolean;
}

export function RemoteVideo({
  stream,
  peerName,
  dark = true,
}: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }

    const checkTrackStates = () => {
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      setIsVideoOn(!!videoTrack && videoTrack.enabled && videoTrack.readyState === 'live');
      setIsAudioOn(!!audioTrack && audioTrack.enabled);
    };

    // Initial check
    checkTrackStates();

    // Set up listeners for track state changes
    stream.addEventListener('addtrack', checkTrackStates);
    stream.addEventListener('removetrack', checkTrackStates);

    const interval = setInterval(checkTrackStates, 1000);

    return () => {
      stream.removeEventListener('addtrack', checkTrackStates);
      stream.removeEventListener('removetrack', checkTrackStates);
      clearInterval(interval);
    };
  }, [stream]);

  const initials = peerName
    ? peerName.charAt(0).toUpperCase()
    : '?';

  return (
    <div
      className={`relative w-full h-full rounded-2xl overflow-hidden shadow-lg border group bg-zinc-950
        ${dark ? 'border-zinc-800/80 shadow-black/45' : 'border-gray-200/80 shadow-gray-200/20'}
      `}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isVideoOn ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Fallback Initials Display */}
      {!isVideoOn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 select-none bg-gradient-to-br from-zinc-900 to-zinc-950">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-[22px] font-bold shadow-inner border
              ${
                dark
                  ? 'bg-zinc-800 text-gray-200 border-zinc-700'
                  : 'bg-zinc-900 text-white border-zinc-800'
              }
            `}
          >
            {initials}
          </div>
          <span className="text-[12px] font-semibold text-gray-400">{peerName}</span>
        </div>
      )}

      {/* Sleek Name Overlay */}
      <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-black/60 backdrop-blur-md text-white flex items-center gap-1.5 border border-white/5 select-none pointer-events-none transition-opacity duration-200">
        <User size={10} className="opacity-80" />
        <span>{peerName}</span>
        {!isAudioOn && (
          <span className="text-red-400 pl-1 border-l border-white/10 flex items-center">
            <MicOff size={10} />
          </span>
        )}
      </div>

      {/* Top right Mute badge indicator */}
      {!isAudioOn && isVideoOn && (
        <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-500/80 backdrop-blur-md text-white border border-red-500/20 select-none pointer-events-none shadow-md">
          <MicOff size={11} />
        </div>
      )}
    </div>
  );
}

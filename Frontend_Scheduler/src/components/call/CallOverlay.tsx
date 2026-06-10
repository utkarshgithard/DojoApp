import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  PhoneOff,
  Volume2,
} from 'lucide-react';
import { CallStatus, PeerConnection } from '@/types/call';
import { PeerStream } from '@/hooks/useGroupCall';
import { RemoteVideo } from './RemoteVideo';
import { CallDurationTimer } from './CallDurationTimer';
import { Participant } from '@/lib/types';

interface CallOverlayProps {
  isOpen: boolean;
  isGroup: boolean;
  status: CallStatus;
  startedAt: Date | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null; // 1:1 call
  peers: PeerStream[]; // group call
  participants: Participant[];
  currentUserId: string;
  isMicOn: boolean;
  isCamOn: boolean;
  isScreenSharing: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreen: () => void;
  onEndCall: () => void;
  peerName?: string; // 1:1 call target
}

export function CallOverlay({
  isOpen,
  isGroup,
  status,
  startedAt,
  localStream,
  remoteStream,
  peers,
  participants,
  currentUserId,
  isMicOn,
  isCamOn,
  isScreenSharing,
  onToggleMic,
  onToggleCam,
  onToggleScreen,
  onEndCall,
  peerName = 'User',
}: CallOverlayProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      // BUG FIX: Always re-assign srcObject here.
      // For the caller, the overlay renders in 'calling' state but the local <video> element
      // isn't rendered until status==='connected'. Re-running this effect when `status` changes
      // ensures the srcObject is applied after the element mounts.
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isOpen, isCamOn, status]);

  if (!isOpen) return null;

  // Resolve participant names in a group call
  const getPeerName = (peerId: string): string => {
    const p = participants.find(
      (part) => String(part.userId || part.user?.id) === String(peerId)
    );
    return p?.user?.name || `Peer ${peerId.slice(0, 4)}`;
  };

  // Determine grid columns based on peer counts
  const getGridClass = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    return 'grid-cols-2 md:grid-cols-3';
  };

  const isConnected = status === 'connected';

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-950 select-none text-white overflow-hidden pointer-events-auto">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full relative flex flex-col justify-between"
        >
          {/* Header Controls */}
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-50 pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/5">
              <Volume2 size={13} className="text-emerald-400" />
              <span className="text-[11px] font-semibold tracking-wide uppercase">
                {isGroup ? 'Group Video Call' : '1:1 Video Call'}
              </span>
            </div>

            {isConnected && <CallDurationTimer startedAt={startedAt} />}

            <div className="w-10 h-10" /> {/* Spacer to balance header layout */}
          </div>

          {/* Main Area */}
          <div className="flex-1 w-full h-full flex items-center justify-center p-4 md:p-8">
            {!isConnected ? (
              // Calling / Ringing screen
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[28px] font-bold shadow-2xl relative z-10">
                    {isGroup
                      ? 'Room'
                      : peerName.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute -inset-4 rounded-full bg-emerald-500/10 animate-ping z-0" />
                  <span className="absolute -inset-8 rounded-full bg-emerald-500/5 animate-pulse z-0" style={{ animationDuration: '3s' }} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">
                    {isGroup ? 'Connecting to Room...' : peerName}
                  </h3>
                  <p className="text-[12.5px] text-gray-400 animate-pulse">
                    {status === 'calling' ? 'Calling...' : 'Ringing...'}
                  </p>
                </div>
              </div>
            ) : (
              // Active connection viewport
              <div className="w-full h-full max-w-6xl max-h-[75vh] flex items-center justify-center">
                {isGroup ? (
                  // Group grid layout
                  <div className={`grid gap-4 w-full h-full ${getGridClass(peers.length)}`}>
                    {peers.map((peer) => (
                      <div key={peer.peerId} className="w-full h-full min-h-[200px]">
                        <RemoteVideo
                          stream={peer.stream}
                          peerName={getPeerName(peer.peerId)}
                          dark={true}
                        />
                      </div>
                    ))}
                    {peers.length === 0 && (
                      <div className="text-center text-gray-400 text-[13px] flex flex-col gap-2">
                        <p className="animate-pulse">Waiting for other participants to connect...</p>
                      </div>
                    )}
                  </div>
                ) : (
                  // 1:1 view (full viewport)
                  <div className="w-full h-full">
                    {remoteStream ? (
                      <RemoteVideo
                        stream={remoteStream}
                        peerName={peerName}
                        dark={true}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900 rounded-2xl border border-zinc-800">
                        <p className="text-[13px] text-gray-400 animate-pulse">
                          Connecting remote stream...
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Local PIP Float View */}
          {isConnected && (
            <div className="absolute bottom-24 right-6 w-32 h-24 sm:w-44 sm:h-32 md:w-56 md:h-40 rounded-xl overflow-hidden shadow-2xl border border-white/10 z-40 bg-zinc-950">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ transform: 'scaleX(-1)' }}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isCamOn ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              />
              {!isCamOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white select-none">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-[13px] font-bold border border-zinc-700">
                    You
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-black/60 backdrop-blur-md text-white border border-white/5 pointer-events-none">
                You
              </div>
            </div>
          )}

          {/* Footer controls bar */}
          <div className="w-full pb-8 flex justify-center z-50">
            <div className="flex items-center gap-4 bg-zinc-900/90 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-2xl">
              {/* Toggle Microphone */}
              <button
                onClick={onToggleMic}
                className={`p-3 rounded-full transition-all active:scale-90 border
                  ${
                    isMicOn
                      ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700'
                      : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'
                  }
                `}
                title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
              >
                {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              {/* Toggle Camera */}
              <button
                onClick={onToggleCam}
                className={`p-3 rounded-full transition-all active:scale-90 border
                  ${
                    isCamOn
                      ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700'
                      : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'
                  }
                `}
                title={isCamOn ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {isCamOn ? <VideoIcon size={18} /> : <VideoOff size={18} />}
              </button>

              {/* Toggle Screen Share */}
              {isConnected && (
                <button
                  onClick={onToggleScreen}
                  className={`p-3 rounded-full transition-all active:scale-90 border
                    ${
                      isScreenSharing
                        ? 'bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20'
                        : 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700'
                    }
                  `}
                  title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
                >
                  <Monitor size={18} />
                </button>
              )}

              <span className="w-px h-6 bg-white/10 mx-1" />

              {/* End Call */}
              <button
                onClick={onEndCall}
                className="p-3 rounded-full transition-all active:scale-90 border border-red-500 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
                title="End Call"
              >
                <PhoneOff size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';

interface IncomingCallToastProps {
  callerName: string;
  onAccept: () => void;
  onReject: () => void;
  dark?: boolean;
  subtitle?: string;
}

export function IncomingCallToast({
  callerName,
  onAccept,
  onReject,
  dark = true,
  subtitle,
}: IncomingCallToastProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Synthesize ringing tone using Web Audio API
  useEffect(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const playRing = () => {
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        // Standard ringing tones: 440Hz + 480Hz
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, audioCtx.currentTime);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, audioCtx.currentTime);

        // Rhythm: 1.5s on, then fade out
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime + 1.4);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.8);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc1.start();
        osc2.start();

        osc1.stop(audioCtx.currentTime + 2.0);
        osc2.stop(audioCtx.currentTime + 2.0);
      };

      // Play immediately
      playRing();

      // Repeat every 4 seconds
      ringIntervalRef.current = setInterval(playRing, 4000);
    } catch (e) {
      console.warn('Could not initialize ringing audio:', e);
    }

    return () => {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Auto-reject / dismiss after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onReject();
    }, 30000);

    return () => clearTimeout(timer);
  }, [onReject]);

  return (
    <div className="fixed bottom-6 right-6 z-[999] pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className={`w-80 p-4 rounded-2xl border shadow-2xl flex flex-col gap-4 backdrop-blur-md
          ${
            dark
              ? 'bg-zinc-950/90 border-zinc-800 text-white shadow-black/80'
              : 'bg-white/95 border-gray-200 text-gray-900 shadow-gray-200/50'
          }
        `}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 shrink-0 relative">
            <Video size={20} className="relative z-10" />
            <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping z-0" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold truncate">{callerName}</p>
            <p className={`text-[11px] ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              {subtitle ?? 'Incoming video call...'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onReject}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold border transition-all active:scale-95
              ${
                dark
                  ? 'border-red-500/40 text-red-400 bg-red-500/8 hover:bg-red-500/15'
                  : 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100'
              }
            `}
          >
            <PhoneOff size={13} />
            Decline
          </button>

          <div className="relative">
            {/* Pulsing ring outline around Accept */}
            <span className="absolute -inset-1 rounded-xl bg-emerald-500/35 animate-pulse z-0" />
            <button
              onClick={onAccept}
              className="relative z-10 flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all active:scale-95 shadow-md shadow-emerald-500/20"
            >
              <Phone size={13} />
              Accept
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useCallState } from './useCallState';
import { CallState } from '@/types/call';
import { toast } from 'sonner';

interface UseVideoCallProps {
  socket: Socket | null;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  userId: string;
}

export function useVideoCall({
  socket,
  localVideoRef,
  remoteVideoRef,
  userId,
}: UseVideoCallProps) {
  const { callState, dispatch } = useCallState();
  const [incomingCall, setIncomingCall] = useState<{
    callerId: string;
    callerName: string;
    offer: RTCSessionDescriptionInit;
  } | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  // Keep a stable ref to the current peer ID so endCall can notify them even in stale closures
  const peerIdRef = useRef<string | null>(null);

  // Fetch fresh ICE server credentials from the backend before each call.
  // Credentials are fetched server-side from Metered's API so they are always
  // fresh and the API key is never exposed to the client.
  const getIceServersAsync = async (): Promise<RTCConfiguration> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    try {
      const res = await fetch(`${apiUrl}/api/ice-servers`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { iceServers: RTCIceServer[] };
      console.log('[ICE] Fetched fresh servers:', data.iceServers.length, 'entries');
      return { iceServers: data.iceServers };
    } catch (err) {
      console.warn('[ICE] Could not fetch from backend, using Google STUN fallback:', err);
      return {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      };
    }
  };

  const endCall = useCallback((notifyPeer = true) => {
    // BUG FIX: Notify the remote peer so their call also terminates automatically
    if (notifyPeer && socket && peerIdRef.current) {
      socket.emit('call:end', { to: peerIdRef.current });
    }
    peerIdRef.current = null;

    // Stop screen share if active
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    // Stop local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Reset video elements
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    originalVideoTrackRef.current = null;
    setIncomingCall(null);
    setLocalStream(null);
    setRemoteStream(null);
    dispatch({ type: 'CALL_END' });
  }, [socket, dispatch, localVideoRef, remoteVideoRef]);

  const initiatePeerConnection = useCallback(async (peerId: string) => {
    if (!socket) return null;

    const configuration = await getIceServersAsync();
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice:candidate', {
          to: peerId,
          from: userId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      if (event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // Track restart attempts to avoid infinite loops
    let iceRestartAttempts = 0;

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        if (iceRestartAttempts < 1 && pcRef.current === pc) {
          // Attempt an ICE restart before giving up — this re-gathers candidates
          // and can recover when the initial STUN path fails but TURN succeeds.
          iceRestartAttempts++;
          pc.restartIce();
          console.warn('[WebRTC] Connection failed — attempting ICE restart...');
        } else {
          toast.error('Call failed. Please check your connection and try again.');
          endCall(false);
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected') {
        // Transient disconnection — try to recover silently
        console.warn('[WebRTC] ICE disconnected — may auto-recover...');
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socket, userId, remoteVideoRef, endCall]);

  const call = useCallback(async (targetUserId: string) => {
    if (!socket) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      peerIdRef.current = targetUserId;
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = await initiatePeerConnection(targetUserId);
      if (!pc) return;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call:initiate', {
        to: targetUserId,
        offer,
      });

      dispatch({
        type: 'CALL_START',
        payload: { peerId: targetUserId, isCaller: true },
      });
    } catch (err: any) {
      console.error('getUserMedia failed:', err);
      toast.error('Could not access camera/microphone.');
    }
  }, [socket, initiatePeerConnection, localVideoRef, dispatch]);

  const answer = useCallback(async (callerId: string, offer: RTCSessionDescriptionInit) => {
    if (!socket) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      peerIdRef.current = callerId;
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = await initiatePeerConnection(callerId);
      if (!pc) return;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answerDesc = await pc.createAnswer();
      await pc.setLocalDescription(answerDesc);

      socket.emit('call:answer', {
        to: callerId,
        answer: answerDesc,
      });

      setIncomingCall(null);
      dispatch({
        type: 'CALL_START',
        payload: { peerId: callerId, isCaller: false },
      });
      dispatch({ type: 'CALL_ANSWER' });
    } catch (err: any) {
      console.error('getUserMedia failed:', err);
      toast.error('Could not access camera/microphone.');
      socket.emit('call:reject', { to: callerId });
      setIncomingCall(null);
    }
  }, [socket, initiatePeerConnection, localVideoRef, dispatch]);

  const reject = useCallback((callerId: string) => {
    if (socket) {
      socket.emit('call:reject', { to: callerId });
    }
    setIncomingCall(null);
    dispatch({ type: 'CALL_END' });
  }, [socket, dispatch]);

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        dispatch({ type: 'TOGGLE_MIC' });
        return audioTrack.enabled;
      }
    }
    return false;
  }, [dispatch]);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        dispatch({ type: 'TOGGLE_CAM' });
        return videoTrack.enabled;
      }
    }
    return false;
  }, [dispatch]);

  const shareScreen = useCallback(async () => {
    if (!pcRef.current) return;

    if (callState.isScreenSharing) {
      // Revert to camera
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }

      if (originalVideoTrackRef.current) {
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(originalVideoTrackRef.current);
        }
        originalVideoTrackRef.current = null;
      }
      dispatch({ type: 'SCREEN_SHARE_END' });
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        const senders = pcRef.current.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');

        if (videoSender) {
          originalVideoTrackRef.current = videoSender.track;
          videoSender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          // Revert to camera silently if user stops sharing via browser bar
          if (pcRef.current) {
            const currentSenders = pcRef.current.getSenders();
            const currentVideoSender = currentSenders.find((s) => s.track?.kind === 'video');
            if (currentVideoSender && originalVideoTrackRef.current) {
              currentVideoSender.replaceTrack(originalVideoTrackRef.current);
            }
          }
          screenTrackRef.current = null;
          originalVideoTrackRef.current = null;
          dispatch({ type: 'SCREEN_SHARE_END' });
        };

        dispatch({ type: 'SCREEN_SHARE_START' });
      } catch (err: any) {
        console.warn('Screen sharing cancelled or failed:', err);
      }
    }
  }, [callState.isScreenSharing, dispatch]);

  // BUG FIX: Sync remoteStream state → video element imperatively.
  // pc.ontrack fires before the <video> is in the DOM (call is still in 'calling' state),
  // so srcObject assignment inside ontrack is lost. This effect re-applies it once visible.
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, remoteVideoRef]);

  useEffect(() => {
    if (!socket) return;

    // Use a ref to read latest status without re-registering the listener on every change
    const getStatus = () => callState.status;

    const handleIncoming = ({ from, callerName, offer }: { from: string; callerName: string; offer: RTCSessionDescriptionInit }) => {
      const currentStatus = getStatus();
      if (currentStatus !== 'idle' && currentStatus !== 'ended') {
        socket.emit('call:busy', { to: from });
        return;
      }
      peerIdRef.current = from;
      setIncomingCall({ callerId: from, callerName, offer });
      dispatch({
        type: 'CALL_START',
        payload: { peerId: from, isCaller: false },
      });
    };

    const handleAnswered = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        dispatch({ type: 'CALL_ANSWER' });
      }
    };

    const handleIce = async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      if (pcRef.current && pcRef.current.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      }
    };

    const handleRejected = () => {
      toast.error('Call rejected.');
      endCall(false); // Don't notify peer — they already rejected
    };

    const handleEnded = () => {
      toast.info('Call ended by the other person.');
      endCall(false); // Don't notify peer — they already ended
    };

    const handleBusy = () => {
      toast.error('User is currently busy.');
      endCall(false);
    };

    socket.on('call:incoming', handleIncoming);
    socket.on('call:answered', handleAnswered);
    socket.on('call:rejected', handleRejected);
    socket.on('call:ended', handleEnded);
    socket.on('call:busy', handleBusy);
    socket.on('ice:candidate', handleIce);

    return () => {
      socket.off('call:incoming', handleIncoming);
      socket.off('call:answered', handleAnswered);
      socket.off('call:rejected', handleRejected);
      socket.off('call:ended', handleEnded);
      socket.off('call:busy', handleBusy);
      socket.off('ice:candidate', handleIce);
    };
  // Only re-register when the socket instance changes (not on every callState.status change)
  }, [socket, endCall, dispatch]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    callState,
    incomingCall,
    localStream,
    remoteStream,
    call,
    answer,
    reject,
    endCall,
    toggleMic,
    toggleCamera,
    shareScreen,
  };
}

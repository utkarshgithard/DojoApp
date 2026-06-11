import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useCallState } from './useCallState';
import { CallState } from '@/types/call';
import { toast } from 'sonner';

interface UseGroupCallProps {
  socket: Socket | null;
  userId: string;
  /** Called when a remote peer leaves the call. Provides the peerId so the UI can show a notification. */
  onPeerLeft?: (peerId: string) => void;
}

export interface PeerStream {
  peerId: string;
  stream: MediaStream;
}

/**
 * Hook for room-based mesh group calling (up to 6 peers).
 * Handles establishing direct peer-to-peer WebRTC connections between all participants.
 * JSDoc: WebRTC signaling (offers, answers, ICE candidates) is NOT encrypted.
 * Media streams are secured natively by WebRTC DTLS-SRTP, and signaling data contains no PII.
 */
export function useGroupCall({ socket, userId, onPeerLeft }: UseGroupCallProps) {
  const { callState, dispatch } = useCallState();
  const [peers, setPeers] = useState<PeerStream[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const currentRoomIdRef = useRef<string | null>(null);

  // Configure ICE servers — STUN for simple NAT, TURN for strict NAT / CGNAT / mobile carriers.
  // Full Metered ICE array: STUN + 4 TURN endpoints (UDP/TCP/TLS) for maximum connectivity.
  const getIceServers = (): RTCConfiguration => {
    const turnUser = process.env.NEXT_PUBLIC_TURN_USER;
    const turnPass = process.env.NEXT_PUBLIC_TURN_PASS;

    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    if (turnUser && turnPass) {
      iceServers.push({ urls: 'stun:stun.relay.metered.ca:80' });

      const turnBase = 'global.relay.metered.ca';
      iceServers.push(
        { urls: `turn:${turnBase}:80`,                       username: turnUser, credential: turnPass },
        { urls: `turn:${turnBase}:80?transport=tcp`,         username: turnUser, credential: turnPass },
        { urls: `turn:${turnBase}:443`,                      username: turnUser, credential: turnPass },
        { urls: `turns:${turnBase}:443?transport=tcp`,       username: turnUser, credential: turnPass },
      );
    }

    return { iceServers };
  };

  const leaveGroupCall = useCallback(() => {
    const roomId = currentRoomIdRef.current;
    if (socket && roomId) {
      socket.emit('room:peer-left', { roomId });
    }

    // Stop screen share track if active
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    // Stop local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);

    // Close all peer connections
    pcsRef.current.forEach((pc) => {
      pc.close();
    });
    pcsRef.current.clear();
    setPeers([]);

    originalVideoTrackRef.current = null;
    currentRoomIdRef.current = null;
    dispatch({ type: 'CALL_END' });
  }, [socket, dispatch]);

  const createPeerConnection = useCallback((peerId: string) => {
    if (!socket) return null;

    const configuration = getIceServers();
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice:candidate', {
          to: peerId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams[0]) {
        setPeers((prev) => {
          if (prev.some((p) => p.peerId === peerId)) {
            return prev.map((p) => p.peerId === peerId ? { ...p, stream: event.streams[0] } : p);
          }
          return [...prev, { peerId, stream: event.streams[0] }];
        });
      }
    };

    let iceRestartAttempts = 0;

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        if (iceRestartAttempts < 1) {
          // Try ICE restart before removing peer tile
          iceRestartAttempts++;
          pc.restartIce();
          console.warn(`[WebRTC] Peer ${peerId} failed — attempting ICE restart...`);
        } else {
          // Restart also failed — clean up this peer
          pc.close();
          pcsRef.current.delete(peerId);
          setPeers((prev) => prev.filter((p) => p.peerId !== peerId));
          console.warn(`[WebRTC] Peer ${peerId} permanently disconnected.`);
        }
      }
      // 'disconnected' is transient — browser may auto-recover, don't remove yet
    };

    // Add local tracks to this new peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pcsRef.current.set(peerId, pc);
    return pc;
  }, [socket]);

  const joinGroupCall = useCallback(async (roomId: string, sessionId?: string) => {
    if (!socket) return;
    try {
      currentRoomIdRef.current = roomId;

      // Ask for media permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Start call state
      dispatch({
        type: 'CALL_START',
        payload: { roomId, isCaller: true },
      });
      dispatch({ type: 'CALL_ANSWER' });

      // Join room via socket — pass sessionId so server can broadcast a session-wide call invite
      socket.emit('room:join-call', { roomId, sessionId });
    } catch (err: any) {
      console.error('getUserMedia failed:', err);
      toast.error('Could not access camera/microphone.');
      currentRoomIdRef.current = null;
    }
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
    if (callState.isScreenSharing) {
      // Revert to camera
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }

      if (originalVideoTrackRef.current) {
        pcsRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track?.kind === 'video');
          if (videoSender && originalVideoTrackRef.current) {
            videoSender.replaceTrack(originalVideoTrackRef.current);
          }
        });
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

        pcsRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track?.kind === 'video');
          if (videoSender) {
            if (!originalVideoTrackRef.current) {
              originalVideoTrackRef.current = videoSender.track;
            }
            videoSender.replaceTrack(screenTrack);
          }
        });

        screenTrack.onended = () => {
          if (originalVideoTrackRef.current) {
            pcsRef.current.forEach((pc) => {
              const currentSenders = pc.getSenders();
              const currentVideoSender = currentSenders.find((s) => s.track?.kind === 'video');
              if (currentVideoSender && originalVideoTrackRef.current) {
                currentVideoSender.replaceTrack(originalVideoTrackRef.current);
              }
            });
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

  useEffect(() => {
    if (!socket) return;

    // We receive the list of all peers currently in the room
    const handleExistingPeers = async ({ peers }: { peers: string[] }) => {
      // Mesh limit: max 6 peers total (including self)
      const allowedPeers = peers.slice(0, 5); 
      for (const peerId of allowedPeers) {
        const pc = createPeerConnection(peerId);
        if (pc) {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('room:relay-offer', { to: peerId, offer });
          } catch (e) {
            console.error('Failed to create offer for peer:', peerId, e);
          }
        }
      }
    };

    // A new peer joined the room
    const handlePeerJoined = ({ userId: peerId }: { userId: string }) => {
      // Mesh limit: max 6 peers total (including self)
      if (pcsRef.current.size >= 5) {
        toast.warning('Room has reached the maximum of 6 participants.');
        return;
      }
      // Note: We wait for the joiner to send us an offer
      createPeerConnection(peerId);
    };

    // We received an offer from a peer
    const handleOffer = async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      let pc = pcsRef.current.get(from);
      if (!pc) {
        pc = createPeerConnection(from) || undefined;
      }
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('room:relay-answer', { to: from, answer });
        } catch (e) {
          console.error('Failed to handle offer from peer:', from, e);
        }
      }
    };

    // We received an answer from a peer
    const handleAnswer = async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = pcsRef.current.get(from);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
          console.error('Failed to set remote answer for peer:', from, e);
        }
      }
    };

    // Relayed ICE candidate from a peer
    const handleIce = async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = pcsRef.current.get(from);
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate from peer:', from, e);
        }
      }
    };

    // A peer left the room
    const handlePeerLeft = ({ userId: peerId }: { userId: string }) => {
      const pc = pcsRef.current.get(peerId);
      if (pc) {
        pc.close();
        pcsRef.current.delete(peerId);
      }
      setPeers((prev) => prev.filter((p) => p.peerId !== peerId));
      // BUG FIX: Notify the UI so it can show a toast/notification
      onPeerLeft?.(peerId);
    };

    socket.on('room:existing-peers', handleExistingPeers);
    socket.on('room:peer-joined', handlePeerJoined);
    socket.on('room:offer', handleOffer);
    socket.on('room:answer', handleAnswer);
    socket.on('ice:candidate', handleIce);
    socket.on('room:peer-left', handlePeerLeft);

    return () => {
      socket.off('room:existing-peers', handleExistingPeers);
      socket.off('room:peer-joined', handlePeerJoined);
      socket.off('room:offer', handleOffer);
      socket.off('room:answer', handleAnswer);
      socket.off('ice:candidate', handleIce);
      socket.off('room:peer-left', handlePeerLeft);
    };
  }, [socket, createPeerConnection]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      leaveGroupCall();
    };
  }, [leaveGroupCall]);

  return {
    callState,
    peers,
    localStream,
    joinGroupCall,
    leaveGroupCall,
    toggleMic,
    toggleCamera,
    shareScreen,
  };
}

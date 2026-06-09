export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export interface CallState {
  status: CallStatus;
  peerId: string | null;
  roomId: string | null;
  isMicOn: boolean;
  isCamOn: boolean;
  isScreenSharing: boolean;
  startedAt: Date | null;
}

export interface SignalPayload {
  to: string;
  from: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface PeerConnection {
  peerId: string;
  pc: RTCPeerConnection;
  stream?: MediaStream;
}

export interface CallServerToClientEvents {
  'call:incoming': (payload: { from: string; callerName: string; offer: RTCSessionDescriptionInit }) => void;
  'call:answered': (payload: { answer: RTCSessionDescriptionInit }) => void;
  'call:rejected': () => void;
  'call:ended': () => void;
  'call:busy': () => void;
  'ice:candidate': (payload: { from: string; candidate: RTCIceCandidateInit }) => void;
  'room:existing-peers': (payload: { peers: string[] }) => void;
  'room:peer-joined': (payload: { userId: string }) => void;
  'room:offer': (payload: { from: string; offer: RTCSessionDescriptionInit }) => void;
  'room:answer': (payload: { from: string; answer: RTCSessionDescriptionInit }) => void;
  'room:peer-left': (payload: { userId: string }) => void;
}

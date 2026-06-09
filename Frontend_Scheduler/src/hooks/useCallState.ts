import { useReducer } from 'react';
import { CallState, CallStatus } from '@/types/call';

export type CallAction =
  | { type: 'CALL_START'; payload: { peerId?: string; roomId?: string; isCaller: boolean } }
  | { type: 'CALL_ANSWER' }
  | { type: 'CALL_END' }
  | { type: 'TOGGLE_MIC' }
  | { type: 'TOGGLE_CAM' }
  | { type: 'SCREEN_SHARE_START' }
  | { type: 'SCREEN_SHARE_END' };

const initialState: CallState = {
  status: 'idle',
  peerId: null,
  roomId: null,
  isMicOn: true,
  isCamOn: true,
  isScreenSharing: false,
  startedAt: null,
};

function callReducer(state: CallState, action: CallAction): CallState {
  switch (action.type) {
    case 'CALL_START':
      return {
        ...state,
        status: action.payload.isCaller ? 'calling' : 'ringing',
        peerId: action.payload.peerId || null,
        roomId: action.payload.roomId || null,
        isMicOn: true,
        isCamOn: true,
        isScreenSharing: false,
        startedAt: null,
      };
    case 'CALL_ANSWER':
      return {
        ...state,
        status: 'connected',
        startedAt: new Date(),
      };
    case 'CALL_END':
      return {
        ...initialState,
        status: 'ended',
      };
    case 'TOGGLE_MIC':
      return {
        ...state,
        isMicOn: !state.isMicOn,
      };
    case 'TOGGLE_CAM':
      return {
        ...state,
        isCamOn: !state.isCamOn,
      };
    case 'SCREEN_SHARE_START':
      return {
        ...state,
        isScreenSharing: true,
      };
    case 'SCREEN_SHARE_END':
      return {
        ...state,
        isScreenSharing: false,
      };
    default:
      return state;
  }
}

export function useCallState() {
  const [callState, dispatch] = useReducer(callReducer, initialState);
  return { callState, dispatch };
}

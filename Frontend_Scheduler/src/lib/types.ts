import { Socket } from "socket.io-client";

// Shared TypeScript types matching the PostgreSQL/Prisma backend models

export interface User {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  friendCode: string;
  createdAt: string;
  bio?: string;
  department?: string;
  avatarUrl?: string;
}

export interface Friend {
  id: string;
  name: string;
  email: string;
  friendCode: string;
  avatarUrl?: string;
}

export interface Subject {
  id: string;
  subject: string;
  subjectName?: string;
  name?: string; // Legacy/Compat
  time?: string;
  days?: string[];
  userId?: string;
  status?: string;
}

export interface AttendanceEntry {
  id: string;
  subject: string;
  status: 'attended' | 'missed' | 'cancelled';
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  entries: AttendanceEntry[];
}

export type ParticipantStatus = 'invited' | 'accepted' | 'declined' | 'removed' | 'joined';
export type SessionStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
export type Visibility = 'private' | 'friends';

export interface Participant {
  id: string;
  sessionId: string;
  userId: string;
  status: ParticipantStatus;
  invitedAt: string;
  respondedAt?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface Message {
  id: string;
  sessionId: string;
  userId: string;
  name: string;
  /** Plaintext message body. For E2EE messages this is populated after decryption. */
  text: string;
  ts: string | Date;
  avatarUrl?: string;
  // Socket.io legacy compat
  _id?: string;
  // ── E2EE fields (present only for encrypted messages) ──
  /** base64 AES-GCM ciphertext of the message body */
  ciphertext?: string;
  /** base64 AES-GCM 12-byte IV */
  iv?: string;
  /** { [userId]: base64WrappedRoomKey } — one entry per recipient */
  encryptedKeys?: Record<string, string>;
}

export interface StudySession {
  id: string;
  creatorId: string;
  subject: string;
  startAt: string;
  duration: number;
  note: string;
  visibility: Visibility;
  status: SessionStatus | string;
  actualStartTime?: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  participants: Participant[];
  messages?: Message[];
  // Socket.io legacy compat (_id = id)
  _id?: string;
}

export interface ScheduleDay {
  [day: string]: Subject[];
}

export interface ScheduleData {
  id: string;
  userId: string;
  schedule: ScheduleDay;
}

export interface SubjectStats {
  subject: string;
  attended: number;
  missed: number;
  cancelled: number;
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// Socket event payloads
export interface SocketInvitePayload {
  id: string; // session ID
  from: string;
  name: string;
  sessionDetails: StudySession;
  _id?: string;
  subject?: string;
  startAt?: string;
  duration?: number;
  invitedAt?: string;
}

export interface SocketSessionScheduledPayload {
  sessionId: string;
  roomId: string;
  sessionDetails: StudySession;
  message: string;
}

export interface CreateSessionPayload {
  subject: string;
  date: string;
  time: string;
  duration: number;
  invitedFriends: string[];
}

// --- Context Types ---

export interface AuthContextType {
  token: string | null;
  userId: string | null;
  login: (newToken: string, uid?: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  userName: string;
  profileLoading: boolean;
  setUserName: React.Dispatch<React.SetStateAction<string>>;
  userDetails: User | null;
  setUserDetails: React.Dispatch<React.SetStateAction<User | null>>;
}

export interface DarkModeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export interface Notification {
  id: number;
  type: 'join' | 'leave';
  userName: string;
  timestamp: Date;
}

export interface SocketContextType {
  socket: Socket | null;
  joinedSessions: Set<string>;
  setJoinedSessions: React.Dispatch<React.SetStateAction<Set<string>>>;
  sessions: any[];
  setSessions: React.Dispatch<React.SetStateAction<any[]>>;
  sessionsLoaded: boolean;
  setSessionsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  userNotifications: Notification[];
  clearNotification: (id: number) => void;
  clearAllNotifications: () => void;
}


export interface AttendanceContextType {
  date: string;
  setDate: React.Dispatch<React.SetStateAction<string>>;
  unmarkedSubjects: Subject[];
  markedSubjects: Subject[];
  fetchSubjects: (latestMarkedSubjects?: Subject[]) => Promise<void>;
  fetchFriends: () => Promise<void>;
  friends: any[];
  friendsLoading: boolean;
  fetchSummary: () => Promise<void>;
  attendanceLoading: boolean;
  holidayLoading: boolean;
  handleAttendance: (subject: Subject, status: string) => Promise<void>;
  markHoliday: () => Promise<void>;
  undoHoliday: () => Promise<void>;
  sessions: any[];
  setSessions: React.Dispatch<React.SetStateAction<any[]>>;
  invites: any[];
  loadExistingInvites: (signal?: AbortSignal) => Promise<void>;
  setInvites: React.Dispatch<React.SetStateAction<any[]>>;
  subjectStats: SubjectStats[];
  setSubjectStats: React.Dispatch<React.SetStateAction<SubjectStats[]>>;
  fetchSubjectStats: () => Promise<void>;
  calendarData: any;
  setCalendarData: React.Dispatch<React.SetStateAction<any>>;
  fetchCalendarData: () => Promise<void>;
}

// --- Component Props & Local Types ---

export interface TypingUsers {
  [userId: string]: string | undefined;
}

export interface SessionChatProps {
  socket: Socket | null;
  session: StudySession | Partial<StudySession> | null;
  isOpen: boolean;
  onClose: () => void;
}

export interface DashboardInvite {
  id: string;
  from: string;
  name: string;
  subject?: string;
  startAt?: string;
  invitedAt?: string;
}

export interface DashboardSession extends StudySession {
  // Can add extra fields if needed, but mostly uses StudySession
}

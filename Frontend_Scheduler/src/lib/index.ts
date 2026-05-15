// Shared TypeScript types matching the PostgreSQL/Prisma backend models

export interface User {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  friendCode: string;
  createdAt: string;
}

export interface Friend {
  id: string;
  name: string;
  email: string;
  friendCode: string;
}

export interface Subject {
  id: string;
  name: string;
  time?: string;
  days: string[];
  userId: string;
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

export type ParticipantStatus = 'invited' | 'accepted' | 'declined' | 'removed';
export type SessionStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
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
  };
}

export interface Message {
  id: string;
  sessionId: string;
  userId: string;
  name: string;
  text: string;
  ts: string;
  // Socket.io legacy compat
  _id?: string;
}

export interface StudySession {
  id: string;
  creatorId: string;
  subject: string;
  startAt: string;
  duration: number;
  note: string;
  visibility: Visibility;
  status: SessionStatus;
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
  from: string;
  name: string;
  sessionDetails: StudySession;
  _id?: string;
  subject?: string;
  startAt?: string;
  duration?: number;
}

export interface SocketSessionScheduledPayload {
  sessionId: string;
  roomId: string;
  sessionDetails: StudySession;
  message: string;
}


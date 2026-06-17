"use client";

import React from 'react';
import SessionStatus from '@/components/SessionStatus';
import { DashboardInvite as Invite, StudySession as Session } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface StudySessionsSectionProps {
  newInviteCount: number;
  setCreateSessionOpen: (val: boolean) => void;
  sessionsLoading: boolean;
  invites: Invite[];
  handleAcceptInvite: (invite: Invite) => void;
  handleDeclineInvite: (invite: Invite) => void;
  pendingInviteId: string | null;
  activeSessions: Session[];
  joinedSessions: Set<string>;
  currentUserId: string | null;
  handleJoinSession: (sessionId: string) => void;
  handleLeaveSession: (sessionId: string) => void;
  openChat: (sessionId: string, sessionDetails: Session) => void;
  setSessionEndConfirm: (confirm: { sessionId: string } | null) => void;
  cardClass: string;
  border: string;
  muted: string;
  primaryBtn: string;
  secondaryBtn: string;
  dangerBtn: string;
  dark: boolean;
}

export default function StudySessionsSection({
  newInviteCount,
  setCreateSessionOpen,
  sessionsLoading,
  invites,
  handleAcceptInvite,
  handleDeclineInvite,
  pendingInviteId,
  activeSessions,
  joinedSessions,
  currentUserId,
  handleJoinSession,
  handleLeaveSession,
  openChat,
  setSessionEndConfirm,
  cardClass,
  border,
  muted,
  primaryBtn,
  secondaryBtn,
  dangerBtn,
  dark,
}: StudySessionsSectionProps) {
  // Client-side filter: only show invites that are less than 15 minutes old
  const activeInvites = invites.filter((invite) => {
    if (!invite.invitedAt) return true;
    const age = Date.now() - new Date(invite.invitedAt).getTime();
    return age <= 15 * 60 * 1000;
  });

  return (
    <section className={cardClass}>
      <p className={`text-[11px] uppercase tracking-widest ${muted} mb-2`}>Co-learning</p>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[16px] font-medium tracking-tight flex items-center gap-2">
          <span>Study Sessions</span>
          {activeInvites.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-black dark:bg-white dark:text-black border border-current rounded-full">
              {activeInvites.length}
            </span>
          )}
        </h2>
        <button
          onClick={() => setCreateSessionOpen(true)}
          className={primaryBtn}
        >
          Create Session
        </button>
      </div>

      {/* Pending Invites */}
      <div className="mb-6">
        <p className={`text-[12px] font-medium mb-3 ${muted}`}>Pending Invites</p>
        {sessionsLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1].map((i) => (
              <div key={i} className={`border rounded-lg p-4 flex justify-between items-center mb-3 ${border}`}>
                <div className="space-y-2">
                  <div className={`h-3.5 rounded w-28 ${dark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                  <div className={`h-3 rounded w-20 ${dark ? 'bg-gray-900/50' : 'bg-gray-100'}`}></div>
                  <div className={`h-2.5 rounded w-16 ${dark ? 'bg-gray-900/50' : 'bg-gray-100'}`}></div>
                </div>
                <div className="flex gap-2">
                  <div className={`h-7 w-16 rounded-lg ${dark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                  <div className={`h-7 w-16 rounded-lg ${dark ? 'bg-gray-900/50' : 'bg-gray-100'}`}></div>
                </div>
              </div>
            ))}
          </div>
        ) : activeInvites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-7 px-4 text-center border border-dashed rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 dark:bg-zinc-950/10">
            <div className={`p-2.5 rounded-full mb-2.5 ${dark ? 'bg-zinc-950 text-zinc-500 border border-zinc-800' : 'bg-zinc-50 text-zinc-400 border border-zinc-100'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <p className={`text-[12.5px] font-semibold ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>No pending invites</p>
            <p className={`text-[11px] ${muted} max-w-[220px] mt-0.5 leading-normal`}>
              When friends invite you to study sessions, they will show up here.
            </p>
          </div>
        ) : (
          (activeInvites as Invite[]).map((invite, idx) => (
            <div
              key={invite.id || idx}
              className={`border rounded-lg p-4 flex justify-between items-center mb-3 ${border}`}
            >
              <div>
                <p className="font-medium text-[14px]">
                  {invite.name || 'Unknown User'}
                </p>
                <p className={`text-[12px] mt-0.5 ${muted}`}>
                  {invite.subject || 'No topic'}
                </p>
                <p className={`text-[11px] mt-1 ${muted}`}>
                  {invite.startAt ? new Date(invite.startAt).toLocaleDateString() : 'No date'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptInvite(invite)}
                  disabled={pendingInviteId !== null}
                  className={`${primaryBtn} flex items-center justify-center gap-1.5`}
                >
                  {pendingInviteId === invite.id ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    'Accept'
                  )}
                </button>
                <button
                  onClick={() => handleDeclineInvite(invite)}
                  disabled={pendingInviteId !== null}
                  className={secondaryBtn}
                >
                  Decline
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Active Sessions */}
      <div>
        <p className={`text-[12px] font-medium mb-3 ${muted}`}>Active Sessions</p>
        {sessionsLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1].map((i) => (
              <div key={i} className={`border rounded-lg p-4 mb-3 ${border}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-2">
                    <div className={`h-4 rounded w-32 ${dark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                    <div className={`h-3 rounded w-24 ${dark ? 'bg-gray-900/50' : 'bg-gray-100'}`}></div>
                  </div>
                  <div className={`h-5 w-20 rounded ${dark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                </div>
                <div className={`space-y-1.5 mb-4`}>
                  <div className={`h-3 rounded w-28 ${dark ? 'bg-gray-900/50' : 'bg-gray-100'}`}></div>
                  <div className={`h-3 rounded w-20 ${dark ? 'bg-gray-900/50' : 'bg-gray-100'}`}></div>
                </div>
                <div className={`pt-3 border-t flex gap-2 ${border}`}>
                  <div className={`h-7 w-24 rounded-lg ${dark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                </div>
              </div>
            ))}
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 dark:bg-zinc-950/10">
            <div className={`p-2.5 rounded-full mb-2.5 ${dark ? 'bg-zinc-950 text-zinc-500 border border-zinc-800' : 'bg-zinc-50 text-zinc-400 border border-zinc-100'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            </div>
            <p className={`text-[12.5px] font-semibold ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>No active sessions</p>
            <p className={`text-[11px] ${muted} max-w-[220px] mt-0.5 leading-normal`}>
              Create a new study session to invite friends and learn together.
            </p>
          </div>
        ) : (
          activeSessions.map((session, idx) => {
            const sessionId = session.id;
            const isJoined = joinedSessions.has(sessionId);

            const isAcceptedParticipant = session.participants?.some(
              (p) =>
                String(p.userId || p.user?.id) === String(currentUserId) &&
                p.status === 'accepted'
            );
            const canJoin =
              (session.status === 'scheduled' || session.status === 'in_progress') &&
              isAcceptedParticipant;

            return (
              <div
                key={sessionId || idx}
                className={`border rounded-lg p-4 mb-3 ${border}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-[15px]">{session.subject}</h3>
                    <p className={`text-[12px] mt-0.5 ${muted}`}>
                      Duration: {session.duration} mins
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase border font-medium ${
                    session.status === 'in_progress' ? 'border-green-500/30 text-green-500 bg-green-500/5' : 'border-gray-500/30 text-gray-500'
                  }`}>
                    <SessionStatus session={session} />
                  </span>
                </div>

                <div className={`space-y-1 text-[12px] ${muted} mb-4`}>
                  <div>
                    {new Date(session.startAt).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div>
                    {new Date(session.startAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </div>
                </div>

                <div className={`pt-3 border-t ${border}`}>
                  <div className="flex gap-2 flex-wrap">
                    {canJoin && !isJoined && (
                      <button
                        onClick={() => handleJoinSession(sessionId)}
                        className={primaryBtn}
                      >
                        Join Chat
                      </button>
                    )}
                    {isJoined && (
                      <>
                        <button
                          onClick={() => openChat(sessionId, session)}
                          className={primaryBtn}
                        >
                          Return to Chat
                        </button>
                      </>
                    )}
                    {session.creatorId === currentUserId && isJoined && (
                      <button
                        onClick={() => setSessionEndConfirm({ sessionId })}
                        className={secondaryBtn}
                      >
                        End Session
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

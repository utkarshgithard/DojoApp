import React, { useEffect, useState } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { useAttendance } from '../context/AttendanceContext';
import SubjectStatsChart from '../components/SubjectStatsChart';
import CreateStudySession from '../components/CreateStudySession';
import SessionChat from '../components/SessionChat';
import { io } from 'socket.io-client';
import API from '../api/axios';
import { SessionStatus } from '../components/SessionStatus';

const Dashboard = () => {
  const { darkMode } = useDarkMode();
  const { date, setDate, unmarkedSubjects, markedSubjects, handleAttendance, invites, loadExistingInvites, setInvites } = useAttendance();

  const [socket, setSocket] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentSessionDetails, setCurrentSessionDetails] = useState(null);
  const [joinedSessions, setJoinedSessions] = useState(new Set());
  const [sessionStates, setSessionStates] = useState({}); // Track detailed session states

  const openChat = (sessionId, sessionDetails) => {
    setCurrentSessionId(sessionId);
    setCurrentSessionDetails(sessionDetails);
    setChatOpen(true);
  };

  const activeSessions = sessions.filter(
    (session) => session.status === "scheduled" || session.status === "in_progress"
  );

  // Helper function to get current user ID
  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.id || payload.sub;
      }
    } catch (error) {
      console.error('Error parsing token:', error);
    }
    return null;
  };

  // Function to check which sessions user has already joined (restore state after refresh)
  const checkJoinedSessions = async () => {
    try {
      // Get current sessions
      const response = await API.get('/study-session/mine');
      const userSessions = response.data;
      
      // Find sessions that are in_progress and where user is an accepted participant
      const newJoinedSessions = new Set();
      const newSessionStates = {};
      const currentUserId = getCurrentUserId();
      
      if (!currentUserId) {
        console.warn('Could not get current user ID');
        setSessions(userSessions);
        return;
      }
      
      userSessions.forEach(session => {
        // Check if user is accepted participant
        const isAcceptedParticipant = session.participants?.some(p => 
          String(p.user._id || p.user) === String(currentUserId) && p.status === 'accepted'
        );
        
        if (isAcceptedParticipant) {
          newSessionStates[session._id] = {
            isAccepted: true,
            canJoin: session.status === 'scheduled' || session.status === 'in_progress'
          };
          
          // If session is in_progress, assume user was joined (restore joined state)
          if (session.status === 'in_progress') {
            newJoinedSessions.add(session._id);
          }
        }
      });
      
      setJoinedSessions(newJoinedSessions);
      setSessionStates(newSessionStates);
      setSessions(userSessions);
      
      console.log('Restored joined sessions:', Array.from(newJoinedSessions));
      console.log('Session states:', newSessionStates);
      
    } catch (error) {
      console.error('Error checking joined sessions:', error);
    }
  };

  // Handle joining a session
  const handleJoinSession = (sessionId) => {
    if (socket && sessionId) {
      console.log('🔗 Joining session:', sessionId);
      socket.emit('joinSession', { sessionId });
    }
  };

  const loadExistingSessions = async () => {
  try {
    const response = await API.get('/study-session/mine');
    setSessions(response.data);
    console.log('Loaded existing sessions:', response.data);
  } catch (error) {
    console.error('Error loading existing sessions:', error);
  }
};

  // Handle leaving a session
  const handleLeaveSession = (sessionId) => {
    if (socket && sessionId) {
      console.log('👋 Leaving session:', sessionId);
      socket.emit('leaveSession', { sessionId });
    }
  };

  useEffect(() => {
    console.log(import.meta.env.VITE_BACKEND_URL)

    loadExistingInvites();
    loadExistingSessions();

    // Connect to backend socket
    const s = io(import.meta.env.VITE_BACKEND_URL, {
      auth: { token: localStorage.getItem('token') },
    });
    setSocket(s);

    // Socket event handlers
    const handleSessionExpired = (data) => {
      setSessions(prev => prev.map(s => s._id === data.sessionId ? data.sessionDetails : s));
    };

    console.log("console log of dashboard")

    s.on('connect', () => {
      console.log('✅ Socket connected!', s.id);
    });

    s.on('connect_error', (err) => {
      console.log('❌ Connection error:', err.message);
    });

    s.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      // Clear joined sessions on disconnect
      setJoinedSessions(new Set());
    });

    // Listen for invites
    s.on('receiveInvite', (inviteData) => {
      console.log('📨 Invite received:', inviteData);
      loadExistingInvites();
    });

    // Listen for session scheduled (when invite is accepted)
    s.on('sessionScheduled', (data) => {
      console.log('📅 Session scheduled:', data);
      // Update sessions list
      setSessions(prev => {
        const existing = prev.find(s => s._id === data.sessionId);
        if (existing) {
          return prev.map(s => s._id === data.sessionId ? data.sessionDetails : s);
        } else {
          return [...prev, data.sessionDetails];
        }
      });
    });

    // Listen for session created by current user
    s.on('sessionCreated', (data) => {
      console.log('🆕 Session created by user:', data);
      setSessions(prev => {
        const existing = prev.find(s => s._id === data.sessionId);
        if (!existing) {
          return [...prev, data.sessionDetails];
        }
        return prev;
      });
    });

    // Listen for session started event (when first user joins)
    s.on('sessionStarted', (data) => {
      console.log('🚀 Session started:', data);
      // Update session status to in_progress
      setSessions(prev => prev.map(s => 
        s._id === data.sessionId ? { ...s, status: 'in_progress' } : s
      ));
    });

    // Listen for successful session join
    s.on('sessionJoined', (data) => {
      console.log('✅ Successfully joined session:', data);
      setJoinedSessions(prev => new Set([...prev, data.sessionId]));
      
      // Update session details if needed
      setSessions(prev => prev.map(s => 
        s._id === data.sessionId ? data.sessionDetails : s
      ));
    });

    // Listen for session left confirmation
    s.on('sessionLeft', (data) => {
      console.log('👋 Left session:', data);
      setJoinedSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.sessionId);
        return newSet;
      });
    });

    // Listen for other users joining
    s.on('userJoinedSession', (data) => {
      console.log('👤 User joined session:', data);
      // You can show a notification or update UI
    });

    // Listen for other users leaving
    s.on('userLeftSession', (data) => {
      console.log('👤 User left session:', data);
      // You can show a notification or update UI
    });

    // Listen for join errors
    s.on('joinError', (data) => {
      console.error('❌ Join error:', data.message);
      alert(`Failed to join session: ${data.message}`);
    });

    // Listen for accepted invites (for session creator)
    s.on('inviteAccepted', (data) => {
      console.log('✅ Invite accepted:', data);
      setSessions((prev) => {
        const existing = prev.find(s => s._id === data.sessionId);
        if (existing) {
          return prev.map(s => s._id === data.sessionId ? data.sessionDetails : s);
        } else {
          return [...prev, data.sessionDetails];
        }
      });
    });

    // Listen for declined invites
    s.on('inviteDeclined', (data) => {
      console.log('❌ Invite declined:', data);
      setInvites((prev) => prev.filter((inv) => inv.from !== data.by));
    });

    s.on('sessionExpired', handleSessionExpired);

    return () => {
      s.off('receiveInvite');
      s.off('sessionScheduled');
      s.off('sessionCreated');
      s.off('sessionStarted');
      s.off('sessionJoined');
      s.off('sessionLeft');
      s.off('userJoinedSession');
      s.off('userLeftSession');
      s.off('joinError');
      s.off('inviteAccepted');
      s.off('inviteDeclined');
      s.off('sessionExpired', handleSessionExpired);
      s.disconnect();
    };
  }, []);

  const handleAcceptInvite = (invite) => {
    console.log('Accepting invite:', invite)
    socket.emit('acceptInvite', {
      sessionDetails: invite,
    });

    // Remove the invite from invites array
    setInvites((prev) => prev.filter((inv) => inv._id !== invite._id));
  };

  const handleDeclineInvite = (invite) => {
    console.log('Declining invite:', invite)
    socket.emit('declineInvite', { fromUserId: invite.from, sessionId: invite._id });

    // Remove the invite from invites array
    setInvites((prev) => prev.filter((inv) => inv._id !== invite._id));
  };

  return (
    <div
      className={`py-20 px-4 md:px-10 min-h-screen mx-auto transition-colors duration-300 ${darkMode ? 'dark bg-gray-800 text-white' : 'bg-white text-black'
        }`}
    >
      <div className="text-2xl font-bold mb-6">Dashboard</div>

      {/* Date Picker */}
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mb-6 p-2 border rounded w-full md:w-64 bg-transparent dark:bg-transparent border-black dark:border-white text-black dark:text-white"
      />

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Attendance */}
        <div className="space-y-8">
          {/* Unmarked Subjects */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Today's Classes</h2>
            {unmarkedSubjects.length === 0 ? (
              <p>No classes scheduled for today.</p>
            ) : (
              <div className="space-y-4">
                {unmarkedSubjects.map((subject) => (
                  <div
                    key={subject._id}
                    className="border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 dark:border-white border-black"
                  >
                    <div>
                      <p className="font-semibold text-lg">{subject.subjectName || subject.subject}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{subject.time}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap mt-2 sm:mt-0">
                      {['attended', 'missed', 'cancelled'].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleAttendance(subject, status)}
                          className="border border-black dark:border-white px-4 py-1 rounded hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Marked Subjects */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Marked Attendance</h2>
            {markedSubjects.length === 0 ? (
              <p>No attendance marked yet.</p>
            ) : (
              <div className="space-y-4">
                {markedSubjects.map((subject) => (
                  <div
                    key={subject._id}
                    className="border rounded-lg p-4 flex justify-between items-center dark:border-white border-black"
                  >
                    <div>
                      <p className="font-semibold text-lg">{subject.subject}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{subject.time}</p>
                    </div>
                    <span
                      className={`px-4 py-1 rounded-full border text-sm uppercase ${subject.status === 'attended'
                        ? 'border-green-500 text-green-600'
                        : subject.status === 'missed'
                          ? 'border-red-500 text-red-600'
                          : 'border-gray-500 text-gray-600'
                        }`}
                    >
                      {subject.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Study Sessions & Stats */}
        <div className="space-y-8">
          {/* Create Study Session */}
          <section>
            <CreateStudySession socket={socket} />
          </section>

          {/* Pending Invites */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Pending Study Invites</h2>
            {invites.length === 0 ? (
              <p>No invites.</p>
            ) : (
              invites.map((invite, idx) => (
                <div
                  key={invite._id || idx}
                  className="border rounded-lg p-4 flex justify-between items-center dark:border-white border-black bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-gray-700 dark:to-gray-800"
                >
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {invite.name || 'Unknown User'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {invite.subject || 'No topic'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {invite.startAt ?
                        new Date(invite.startAt).toLocaleDateString() :
                        'No date'
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptInvite(invite)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineInvite(invite)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Active Sessions */}
          <section >
            <h2 className="text-xl font-semibold mb-4">Study Sessions</h2>
            {activeSessions.length === 0 ? (
              <p>No active sessions.</p>
            ) : (
              activeSessions.map((session, idx) => (
                <div
                  key={session._id || idx}
                  className="border rounded-lg p-4 gap-4 dark:border-white border-black bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 mb-1"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                        {session.subject}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Duration: {session.duration} minutes
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span className="px-3 py-1 rounded-full text-xs font-medium">
                      <SessionStatus session={session} />
                    </span>
                  </div>

                  {/* Session Details */}
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {new Date(session.startAt).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {new Date(session.startAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex gap-2 flex-wrap">
                      {/* Determine if user can join this session */}
                      {(() => {
                        const currentUserId = getCurrentUserId();
                        const isAcceptedParticipant = session.participants?.some(p => 
                          String(p.user._id || p.user) === String(currentUserId) && p.status === 'accepted'
                        );
                        const isJoined = joinedSessions.has(session._id);
                        const canJoin = (session.status === 'scheduled' || session.status === 'in_progress') && isAcceptedParticipant;

                        return (
                          <>
                            {/* Join Button - show if user is accepted participant and not joined yet */}
                            {canJoin && !isJoined && (
                              <button
                                onClick={() => handleJoinSession(session._id)}
                                className="px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors flex items-center gap-1"
                              >
                                Join Session
                              </button>
                            )}

                            {/* Leave Button - show if user has joined */}
                            {isJoined && (
                              <button
                                onClick={() => handleLeaveSession(session._id)}
                                className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors flex items-center gap-1"
                              >
                                Leave Session
                              </button>
                            )}

                            {/* Chat Button - show if user has joined */}
                            {isJoined && (
                              <button
                                onClick={() => openChat(session._id, session)}
                                className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors flex items-center gap-1"
                              >
                                Chat
                              </button>
                            )}

                            {/* Status indicator */}
                            {isJoined && (
                              <span className="px-3 py-2 bg-green-100 text-green-800 text-sm rounded dark:bg-green-800 dark:text-green-100 flex items-center gap-1">
                                Joined
                              </span>
                            )}

                            {/* Show if user is not an accepted participant */}
                            {!isAcceptedParticipant && session.status === 'pending' && (
                              <span className="px-3 py-2 bg-yellow-100 text-yellow-800 text-sm rounded dark:bg-yellow-800 dark:text-yellow-100">
                                Waiting for response
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Attendance Chart */}
          <section>
            <SubjectStatsChart />
          </section> 
        </div>
      </div>

      {/* Chat Modal */}
      {chatOpen && (
        <SessionChat
          socket={socket}
          session={currentSessionDetails}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
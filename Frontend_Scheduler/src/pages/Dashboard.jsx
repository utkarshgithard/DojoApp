import React, { useEffect, useState } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { useAttendance } from '../context/AttendanceContext';
import SubjectStatsChart from '../components/SubjectStatsChart';
import CreateStudySession from '../components/CreateStudySession';
import SessionChat from '../components/SessionChat';
import { useSocket } from '../context/SocketContext';
import API from '../api/axios';
import { SessionStatus } from '../components/SessionStatus';
import Swal from 'sweetalert2';

const Dashboard = () => {
  const { darkMode } = useDarkMode();
  const { date, setDate, unmarkedSubjects, markedSubjects, handleAttendance, invites, loadExistingInvites, setInvites, friends } = useAttendance();
  const { socket, joinedSessions, setJoinedSessions, sessions, setSessions, userNotifications, clearNotification, clearAllNotifications } = useSocket();
  const [chatOpen, setChatOpen] = useState(false);
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentSessionDetails, setCurrentSessionDetails] = useState(null);
  const [sessionStates, setSessionStates] = useState({});
  const [friendCode, setFriendCode] = useState("");
  const [message, setMessage] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

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

  const openChat = (sessionId, sessionDetails) => {
    setCurrentSessionId(sessionId);
    setCurrentSessionDetails(sessionDetails);
    setChatOpen(true);
  };

  const openCreateSession = () => {
    setCreateSessionOpen(true);
  };

  const closeCreateSession = () => {
    setCreateSessionOpen(false);
  };

  // Function to add friend
  const handleAddFriend = async () => {
    if (!friendCode) return;

    try {
      const res = await API.post('/auth/add', {
        friendCode: friendCode
      });

      setMessage(res.data.message);
      setFriendCode("");
    } catch (error) {
      setMessage(
        error.response?.data?.error || "Failed to add friend"
      );
    }
  };

  const activeSessions = sessions.filter(
    (session) => session.status === "scheduled" || session.status === "in_progress"
  );

  // Function to check which sessions user has already joined
  const checkJoinedSessions = async () => {
    try {
      const response = await API.get('/study-session/mine');
      const userSessions = response.data;

      const newJoinedSessions = new Set();
      const newSessionStates = {};
      const currentUserId = getCurrentUserId();

      if (!currentUserId) {
        console.warn('Could not get current user ID');
        setSessions(userSessions);
        return;
      }

      userSessions.forEach(session => {
        const isAcceptedParticipant = session.participants?.some(p =>
          String(p.user._id || p.user) === String(currentUserId) && p.status === 'accepted'
        );

        if (isAcceptedParticipant) {
          newSessionStates[session._id] = {
            isAccepted: true,
            canJoin: session.status === 'scheduled' || session.status === 'in_progress'
          };

          if (session.status === 'in_progress') {
            newJoinedSessions.add(session._id);
          }
        }
      });

      setJoinedSessions(newJoinedSessions);
      setSessionStates(newSessionStates);
      setSessions(userSessions);

    } catch (error) {
      console.error('Error checking joined sessions:', error);
    }
  };

  // Handle joining a session
  const handleJoinSession = (sessionId) => {
    if (socket && sessionId) {
      console.log('🔗 Joining session:', sessionId);
      socket.emit('joinSession', { sessionId });

      // Add to localStorage
      setJoinedSessions(prev => {
        const newSet = new Set([...prev, sessionId]);
        localStorage.setItem('joinedSessions', JSON.stringify([...newSet]));
        return newSet;
      });
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

      // Remove from localStorage
      setJoinedSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        localStorage.setItem('joinedSessions', JSON.stringify([...newSet]));
        return newSet;
      });
    }
  };

  useEffect(() => {
    console.log(import.meta.env.VITE_BACKEND_URL);

    // Load joined sessions from localStorage on component mount
    const savedJoinedSessions = localStorage.getItem('joinedSessions');
    if (savedJoinedSessions) {
      try {
        const sessions = JSON.parse(savedJoinedSessions);
        setJoinedSessions(new Set(sessions));
      } catch (error) {
        console.error('Error parsing joined sessions:', error);
      }
    }

    loadExistingInvites();
    loadExistingSessions();

    if (!socket) {
      console.log('Socket not available yet');
      return;
    }

    // Socket event handlers
    const handleSessionExpired = (data) => {
      setSessions(prev => prev.map(s => s._id === data.sessionId ? data.sessionDetails : s));
    };

    socket.on('connect', () => {
      console.log('✅ Socket connected!', socket.id);

      // Re-join all sessions after connection
      joinedSessions.forEach(sessionId => {
        console.log('Re-joining session after connection:', sessionId);
        socket.emit('joinSession', { sessionId });
      });
    });

    socket.on('connect_error', (err) => {
      console.log('❌ Connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    // Listen for socket reconnection
    socket.on('reconnect', () => {
      console.log('✅ Socket reconnected!', socket.id);

      // Re-join all sessions after reconnection
      joinedSessions.forEach(sessionId => {
        console.log('Re-joining session after reconnect:', sessionId);
        socket.emit('joinSession', { sessionId });
      });
    });

    // Listen for invites
    socket.on('receiveInvite', (inviteData) => {
      console.log('📨 Invite received:', inviteData);
      loadExistingInvites();
    });

    // Listen for session scheduled
    socket.on('sessionScheduled', (data) => {
      console.log('📅 Session scheduled:', data);
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
    socket.on('sessionCreated', (data) => {
      console.log('🆕 Session created by user:', data);
      setSessions(prev => {
        const existing = prev.find(s => s._id === data.sessionId);
        if (!existing) {
          return [...prev, data.sessionDetails];
        }
        return prev;
      });
      closeCreateSession();
    });

    // Listen for session started event
    socket.on('sessionStarted', (data) => {
      console.log('🚀 Session started:', data);
      setSessions(prev => prev.map(s =>
        s._id === data.sessionId ? { ...s, status: 'in_progress' } : s
      ));
    });

    // Listen for successful session join
    socket.on('sessionJoined', (data) => {
      console.log('✅ Successfully joined session:', data);
      setJoinedSessions(prev => {
        const newSet = new Set([...prev, data.sessionId]);
        localStorage.setItem('joinedSessions', JSON.stringify([...newSet]));
        return newSet;
      });

      setSessions(prev => prev.map(s =>
        s._id === data.sessionId ? data.sessionDetails : s
      ));
    });

    // Listen for session left confirmation
    socket.on('sessionLeft', (data) => {
      console.log('👋 Left session:', data);
      setJoinedSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.sessionId);
        localStorage.setItem('joinedSessions', JSON.stringify([...newSet]));
        return newSet;
      });
    });

    // Listen for other users joining
    socket.on('userJoinedSession', (data) => {
      console.log('👤 User joined session:', data);

      // Update sessions to show the new participant
      setSessions(prev => prev.map(session =>
        session._id === data.sessionId
          ? {
            ...session,
            participants: session.participants.map(p =>
              p.user._id === data.userId
                ? { ...p, status: 'joined' }
                : p
            )
          }
          : session
      ));
    });

    // Listen for other users leaving
    socket.on('userLeftSession', (data) => {
      console.log('👤 User left session:', data);

      // Update sessions
      setSessions(prev => prev.map(session =>
        session._id === data.sessionId
          ? {
            ...session,
            participants: session.participants.map(p =>
              p.user._id === data.userId
                ? { ...p, status: 'accepted' } // Reset to accepted status
                : p
            )
          }
          : session
      ));
    });

    // Listen for join errors
    socket.on('joinError', (data) => {
      console.error('❌ Join error:', data.message);
      alert(`Failed to join session: ${data.message}`);
    });

    // Listen for accepted invites
    socket.on('inviteAccepted', (data) => {
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
    socket.on('inviteDeclined', (data) => {
      console.log('❌ Invite declined:', data);
      setInvites((prev) => prev.filter((inv) => inv.from !== data.by));
    });

    socket.on('sessionExpired', handleSessionExpired);

    return () => {
      // Only remove event listeners, don't disconnect the socket
      socket.off('receiveInvite');
      socket.off('sessionScheduled');
      socket.off('sessionCreated');
      socket.off('sessionStarted');
      socket.off('sessionJoined');
      socket.off('sessionLeft');
      socket.off('userJoinedSession');
      socket.off('userLeftSession');
      socket.off('joinError');
      socket.off('inviteAccepted');
      socket.off('inviteDeclined');
      socket.off('sessionExpired', handleSessionExpired);
      socket.off('reconnect');
    };
  }, [socket]); // Add socket as dependency

  const handleAcceptInvite = (invite) => {
    console.log('Accepting invite:', invite)
    socket.emit('acceptInvite', {
      sessionDetails: invite,
    });

    setInvites((prev) => prev.filter((inv) => inv._id !== invite._id));
  };

  const handleDeclineInvite = (invite) => {
    console.log('Declining invite:', invite)
    socket.emit('declineInvite', { fromUserId: invite.from, sessionId: invite._id });

    setInvites((prev) => prev.filter((inv) => inv._id !== invite._id));
  };

  return (
    <div
      className={`py-20 px-4  md:px-10 min-h-screen mx-auto transition-colors duration-300 ${darkMode ? 'dark bg-gray-800 text-white' : 'bg-white text-black'
        }`}
    >
      {/* Notification Bell */}

      <div className="my-heading text-2xl font-bold  mb-6">Dashboard</div>

      {/* Date Picker */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 ">Select Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="p-2 border rounded w-full md:w-64 bg-transparent dark:bg-transparent border-black dark:border-white text-black dark:text-white"
        />
      </div>

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Social Features & Attendance */}
        <div className="space-y-8">
          {/* Friends Section */}
          <section className="p-4 rounded-2xl shadow-md bg-white dark:bg-gray-800">
            <h2 className="text-xl friend font-semibold mb-4">Friends</h2>

            {/* Add Friend */}
            <div className="mb-6">
              <h3 className="text-md font-medium mb-3">Add a Friend</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter 6-digit friend code"
                  value={friendCode}
                  onChange={(e) => setFriendCode(e.target.value)}
                  className="border rounded-lg p-2 flex-1 dark:bg-gray-700 dark:text-white"
                  maxLength={6}
                />
                <button
                  onClick={handleAddFriend}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              {message && (
                <p className="mt-2 text-sm text-green-500">{message}</p>
              )}
            </div>

            {/* Friends List */}
            <div>
              <h3 className="text-md font-medium mb-3">Your Friends</h3>
              {friends.length === 0 ? (
                <p className="text-gray-500">No friends added yet.</p>
              ) : (
                <ul className="space-y-2">
                  {friends.map((f) => (
                    <li
                      key={f._id}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 flex justify-between items-center" // Added items-center
                    >
                      <span>{f.name}</span>
                      <div className="flex items-center gap-2"> {/* New wrapper div */}
                        <span className="text-sm text-gray-500">
                           {f.friendCode}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(f.friendCode);
                            // Optional: Add feedback here (e.g., toast notification, change icon temporarily)
                          }}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label={`Copy ${f.friendCode} to clipboard`}
                        >
                          {/* Heroicons clipboard document - you can replace this with your preferred icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Unmarked Subjects */}
          <section className="p-4 rounded-2xl shadow-md bg-white dark:bg-gray-800">
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
          <section className="p-4 rounded-2xl shadow-md bg-white dark:bg-gray-800">
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
          {/* Study Session Actions */}
          <section className="p-4 rounded-2xl shadow-md bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Study Sessions</h2>
              <button
                onClick={openCreateSession}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Session
              </button>
            </div>

            {/* Pending Invites */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Pending Invites</h3>
              {invites.length === 0 ? (
                <p className="text-gray-500">No pending invites.</p>
              ) : (
                invites.map((invite, idx) => (
                  <div
                    key={invite._id || idx}
                    className="border rounded-lg p-4 flex justify-between items-center dark:border-white border-black bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-gray-700 dark:to-gray-800 mb-3"
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
            </div>

            {/* Active Sessions */}
            <div>
              <h3 className="text-lg font-medium mb-3">Active Sessions</h3>
              {activeSessions.length === 0 ? (
                <p className="text-gray-500">No active sessions.</p>
              ) : (
                activeSessions.map((session, idx) => (
                  <div
                    key={session._id || idx}
                    className="border rounded-lg p-4 gap-4 dark:border-white border-black bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 mb-3"
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

                    {/* Participants Section */}
                    <div className="mt-2">
                      <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Participants ({session.participants?.length || 0})
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {session.participants?.slice(0, 5).map(participant => (
                          <span
                            key={participant.user._id || participant.user}
                            className={`text-xs px-2 py-1 rounded-full ${participant.status === 'joined'
                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            title={participant.user.name}
                          >
                            {participant.user.name ? participant.user.name.split(' ')[0] : 'User'}
                            {participant.status === 'joined' && ' ✓'}
                          </span>
                        ))}
                        {session.participants?.length > 5 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            +{session.participants.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex gap-2 flex-wrap">
                        {(() => {
                          const currentUserId = getCurrentUserId();
                          const isAcceptedParticipant = session.participants?.some(p =>
                            String(p.user._id || p.user) === String(currentUserId) && p.status === 'accepted'
                          );
                          const isJoined = joinedSessions.has(session._id);
                          const canJoin = (session.status === 'scheduled' || session.status === 'in_progress') && isAcceptedParticipant;

                          return (
                            <>
                              {canJoin && !isJoined && (
                                <button
                                  onClick={() => handleJoinSession(session._id)}
                                  className="px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors flex items-center gap-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                  </svg>
                                  Join Session
                                </button>
                              )}

                              {isJoined && (
                                <>
                                  <button
                                    onClick={() => handleLeaveSession(session._id)}
                                    className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors flex items-center gap-1"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Leave Session
                                  </button>
                                  <button
                                    onClick={() => openChat(session._id, session)}
                                    className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors flex items-center gap-1"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    Chat
                                  </button>
                                  <span className="px-3 py-2 bg-green-100 text-green-800 text-sm rounded dark:bg-green-800 dark:text-green-100 flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Joined
                                  </span>
                                </>
                              )}

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
            </div>
          </section>

          {/* Attendance Chart */}
          <section className="p-4 rounded-2xl shadow-md bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">Attendance Statistics</h2>
            <SubjectStatsChart />
          </section>
        </div>
      </div>

      {/* Create Session Modal */}
      {createSessionOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Create Study Session</h3>
              <button
                onClick={closeCreateSession}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                &times;
              </button>
            </div>
            <CreateStudySession socket={socket} onClose={closeCreateSession} />
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {chatOpen && (
        <SessionChat
          socket={socket}
          session={currentSessionDetails}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}
      <div className="fixed bottom-5 right-3 z-50">
        <div className="relative">
          <button
            onClick={() => setShowNotifications(prev => !prev)}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {userNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {userNotifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-6 bottom-14 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold">Recent Activity</h3>
                <button
                  onClick={clearAllNotifications}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear All
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {userNotifications.length === 0 ? (
                  <p className="p-4 text-gray-500 text-center">No recent activity</p>
                ) : (
                  userNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-start"
                    >
                      <div className={`rounded-full p-2 mr-3 ${notification.type === 'join'
                          ? 'bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-200'
                          : 'bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-200'
                        }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {notification.type === 'join' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          )}
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {notification.userName} {notification.type === 'join' ? 'joined' : 'left'} {notification.sessionSubject}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => clearNotification(notification.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        &times;
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
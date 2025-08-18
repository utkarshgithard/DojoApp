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
  const { date, setDate, unmarkedSubjects, markedSubjects, handleAttendance, invites, loadExistingInvites } = useAttendance();

  const [socket, setSocket] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentSessionDetails, setCurrentSessionDetails] = useState(null);

  const activeSessions = sessions.filter(
    (session) => session.status === "scheduled" || session.status === "in_progress"
  );

  // Function to load existing invites using your axios instance


  // Function to load existing sessions using your axios instance
  const loadExistingSessions = async () => {
    try {
      const response = await API.get('/study-session/mine');
      console.log('📥 Loaded existing sessions:', response.data);
      setSessions(() => response.data);
    } catch (error) {
      console.error('❌ Error loading sessions:', error);
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

    // Socket events
    const handleSessionStarted = (data) => {
      setSessions(prev => prev.map(s => s._id === data.sessionId ? data.sessionDetails : s));
    };

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
    });

    // Listen for invites
    s.on('receiveInvite', (inviteData) => {
      console.log("what ")
      console.log('�� Invite received:', inviteData);
      setInvites(prev => [...prev, inviteData]);
      console.log(invites)
    });

    // Listen for session started event
    s.on('sessionStarted', (data) => {
      console.log('�� Session started:', data);
      // Update sessions list
      setSessions(prev => {
        const existing = prev.find(s => s._id === data.sessionId);
        if (!existing) {
          return [...prev, data.sessionDetails];
        }
        return prev;
      });
    });

    // Listen for accepted invites
    s.on('inviteAccepted', (data) => {
      console.log('✅ Invite accepted:', data);
      setSessions((prev) => [...prev, data.sessionDetails]);

      // Join the session room
      if (data.roomId) {
        s.emit('joinSessionRoom', { sessionId: data.sessionId, roomId: data.roomId });
      }
    });

    // Listen for declined invites
    s.on('inviteDeclined', (data) => {
      console.log('❌ Invite declined:', data);
      setInvites((prev) => prev.filter((inv) => inv.from !== data.by));
    });

    // Listen for session room join request
    s.on('joinSessionRoom', ({ sessionId, roomId }) => {
      console.log('🔗 Joining session room:', roomId);
      s.emit('joinSessionRoom', { sessionId, roomId });
    });

    s.on('sessionStarted', handleSessionStarted);
    s.on('sessionExpired', handleSessionExpired);

    return () => {
      s.off('receiveInvite');
      s.off('inviteAccepted');
      s.off('inviteDeclined');
      s.off('joinSessionRoom');
      s.off('sessionStarted', handleSessionStarted);
      s.off('sessionExpired', handleSessionExpired);
      s.disconnect();
    };
  }, []);

  const handleAcceptInvite = (invite) => {
    socket.emit('acceptInvite', {
      fromUserId: invite.from,
      sessionDetails: invite,
    });

    // Remove the invite from invites array
    setInvites((prev) => prev.filter((inv) => inv._id !== invite._id));
  };

  const handleDeclineInvite = (invite) => {
    socket.emit('declineInvite', { fromUserId: invite.from });

    // Remove the invite from invites array
    setInvites((prev) => prev.filter((inv) => inv._id !== invite._id));
  };

  const openChat = (sessionId, sessionDetails) => {
    setCurrentSessionId(sessionId);
    setCurrentSessionDetails(sessionDetails);
    setChatOpen(true);
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
          {activeSessions.length === 0 ? (
            <p>No active sessions.</p>
          ) : (
            activeSessions.map((session, idx) => (
              <div
                key={session._id || idx}
                className="border rounded-lg p-4 dark:border-white border-black bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800"
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
                   <SessionStatus session={session}/>
                  </span>
                </div>

                {/* Other details remain the same */}
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

                {/* Chat Button */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={() => openChat(session._id, session)}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                  >
                    💬 Chat
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Attendance Chart */}
          <section>
            <SubjectStatsChart />
          </section>
        </div>
      </div>

      {/* Chat Modal */}
      {chatOpen && (
        <SessionChat
          sessionId={currentSessionId}
          socket={socket}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          sessionDetails={currentSessionDetails}
        />
      )}
    </div>
  );
};

export default Dashboard;
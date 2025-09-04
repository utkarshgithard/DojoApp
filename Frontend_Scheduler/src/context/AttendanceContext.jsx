import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';
import Swal from 'sweetalert2';
import moment from 'moment';
import { useSocket } from "./SocketContext.jsx";
import { createSession as apiCreate, getMySessions, getMyInvites, respondInvite as apiRespond } from "../services/studySessionService";

const Ctx = createContext(null);
export const useAttendance = () => useContext(Ctx);

export const AttendanceProvider = ({ children }) => {
  const socket = useSocket();
  const [date, setDate] = useState(moment().format('YYYY-MM-DD'));
  const [unmarkedSubjects, setUnmarkedSubjects] = useState([]);
  const [markedSubjects, setMarkedSubjects] = useState([]);
  // New: Study friends & sessions
  const [sessions, setSessions] = useState([]);
  const [invites, setInvites] = useState([]);
  const [friends, setFriends] = useState([]);

  const fetchFriends = async () => {
    try {
      
      const res = await API.get("auth/friends-List");
      setFriends(res.data.friends);
    } catch (err) {
      console.error("Failed to load friends", err);
    }
  };

    const fetchSubjects = async (latestMarkedSubjects = []) => {
      try {
        const res = await API.get(`/subject?date=${date}`);
        const allSubjects = res.data.unmarkedSubjects || [];
        const filteredSubjects = allSubjects.filter(
          (subject) =>
            !latestMarkedSubjects.some(
              (marked) =>
                marked.subject.toLowerCase() === subject.subject.toLowerCase()
            )
        );
        setUnmarkedSubjects(filteredSubjects);
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    };

    const fetchSummary = async () => {
      try {
        const res = await API.get(`/attendance/summary?date=${date}`);
        const summaryArray = res.data.summary;
        setMarkedSubjects(summaryArray);
        await fetchSubjects(summaryArray);
      } catch (error) {
        console.error('Error fetching summary:', error);
      }
    };

    const loadExistingInvites = async () => {
      try {
        const response = await API.get('/study-session/invites');
        console.log('📥 Loaded existing invites:', response.data);
        setInvites(() => response.data);
      } catch (error) {
        console.error('❌ Error loading invites:', error);
      }
    };

    // ---- Study sessions: REST helpers ----
    const refreshSessions = async () => {
      const [mine, pend] = await Promise.all([getMySessions(), getMyInvites()]);
      setSessions(mine.data);
      setInvites(pend.data);
    };

    const createSession = async ({ subject, date, time, duration, note, invitedFriends }) => {
      await apiCreate({ subject, startAt: datetime, duration, note, invitedFriendIds: invitedFriends });
      // optimistic: you could skip refetch; but tiny refetch keeps it simple
      await refreshSessions();
      Swal.fire("Success", "Study session created!", "success");
    };

    const respondInvite = async (sessionId, action) => {
      // optimistic remove from invites
      setInvites(prev => prev.filter(s => s._id !== sessionId));
      try {
        await apiRespond(sessionId, action);
        await refreshSessions();
      } catch (e) {
        await refreshSessions(); // rollback by refetch
        throw e;
      }
    };

    const handleAttendance = async (subject, status) => {
      try {
        const result = await Swal.fire({
          title: `Mark "${subject.subjectName || subject.subject}" as "${status}"?`,
          text: "This action cannot be undone.",
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Yes',
          cancelButtonText: 'No',
        });

        if (!result.isConfirmed) return;

        await API.post('/attendance/mark', {
          date,
          status: [{
            subject: subject.subjectName || subject.subject,
            status
          }]
        });

        setUnmarkedSubjects(prev => prev.filter(s => s._id !== subject._id));
        setMarkedSubjects(prev => [...prev, { ...subject, status }]);

        Swal.fire('Success', 'Attendance marked successfully.', 'success');
      } catch (error) {
        console.error('Error marking attendance:', error);
        Swal.fire('Error', 'Could not mark attendance.', 'error');
      }
    };

    // ---- Socket realtime listeners ----
    useEffect(() => {
      if (!socket) return;
      const onCreated = (session) => {
        // if I'm creator or invited, update lists appropriately
        setSessions(prev => {
          const exists = prev.some(s => s._id === session._id);
          return exists ? prev : [...prev, session].sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
        });
        // if I'm invited (status invited for me), add to invites
        const me = session.participants?.find(p => p.user === socket.userId || p.user?._id === socket.userId);
        if (me && me.status === "invited") {
          setInvites(prev => {
            const exists = prev.some(s => s._id === session._id);
            return exists ? prev : [...prev, session];
          });
        }
      };
      const onUpdated = (session) => {
        setSessions(prev => prev.map(s => s._id === session._id ? session : s));
        // if I’m the responder, it arrives too; remove from invites if not invited anymore
        setInvites(prev => prev.filter(s => s._id !== session._id || (session.participants || []).some(p => p.user === socket.userId && p.status === "invited")));
      };
      const onInviteUpdated = ({ sessionId }) => {
        // creator receives this; refresh the one session or just refetch
        setSessions(prev => prev); // no-op; keep simple
        refreshSessions();
      };
      const onCancelled = ({ sessionId }) => {
        setSessions(prev => prev.map(s => s._id === sessionId ? { ...s, status: "cancelled" } : s));
        setInvites(prev => prev.filter(s => s._id !== sessionId));
      };

      socket.on("session:created", onCreated);
      socket.on("session:updated", onUpdated);
      socket.on("invite:updated", onInviteUpdated);
      socket.on("session:cancelled", onCancelled);

      return () => {
        socket.off("session:created", onCreated);
        socket.off("session:updated", onUpdated);
        socket.off("invite:updated", onInviteUpdated);
        socket.off("session:cancelled", onCancelled);
      };
    }, [socket]);

    useEffect(() => {
      fetchSummary();
    }, [date]);
    useEffect(()=>{
      fetchFriends();
    },[])

    return (
      <Ctx.Provider value={{
        date, setDate,
        unmarkedSubjects,
        markedSubjects,
        fetchSubjects,fetchFriends,friends,
        fetchSummary,
        handleAttendance, sessions, invites,
        createSession, respondInvite, refreshSessions, loadExistingInvites, setInvites

      }}>
        {children}
      </Ctx.Provider>
    );
  };

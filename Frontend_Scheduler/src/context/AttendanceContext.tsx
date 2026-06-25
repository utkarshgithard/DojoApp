"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '@/lib/axios';
import { toast } from 'sonner';
import moment from 'moment';
import { useSocket } from "./SocketContext";
import { useAuth } from "./authContext";
import { useRouter } from 'next/navigation';
import { Subject, AttendanceContextType, SubjectStats } from '@/lib/types';

const Ctx = createContext<AttendanceContextType | null>(null);
export const useAttendance = () => useContext(Ctx);

const DUMMY_CLASSES: Subject[] = [
  { id: 'dummy-1', subject: 'CS 101: Intro to Programming (Demo)', subjectName: 'CS 101: Intro to Programming (Demo)', time: '09:00 AM', isDummy: true },
  { id: 'dummy-2', subject: 'MATH 201: Linear Algebra (Demo)', subjectName: 'MATH 201: Linear Algebra (Demo)', time: '11:30 AM', isDummy: true },

];

export const AttendanceProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const socketContext = useSocket();
  const { isAuthenticated, loading } = useAuth();
  const [date, setDate] = useState(moment().format('YYYY-MM-DD'));
  const [unmarkedSubjects, setUnmarkedSubjects] = useState<Subject[]>([]);
  const [markedSubjects, setMarkedSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [calendarData, setCalendarData] = useState<any>(null);
  const [hasSavedSchedule, setHasSavedSchedule] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(true);

  const fetchCalendarData = useCallback(async (retryCount = 0) => {
    try {
      const res = await API.get("/schedule/calender");
      setCalendarData(res.data.schedule);
      setHasSavedSchedule(!!res.data.id);
    } catch (err: any) {
      if ((err?.response?.status === 503 || err?.response?.status === 500) && retryCount < 3) {
        console.warn(`⏳ Server or database not ready, retrying fetchCalendarData in 3s (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => fetchCalendarData(retryCount + 1), 3000);
      } else {
        console.error("Error fetching calendar:", err);
      }
    }
  }, []);

  const fetchSubjectStats = useCallback(async (retryCount = 0) => {
    try {
      const res = await API.get("/subject/stats");
      setSubjectStats(res.data.data);
    } catch (err: any) {
      if ((err?.response?.status === 503 || err?.response?.status === 500) && retryCount < 3) {
        console.warn(`⏳ Server or database not ready, retrying fetchSubjectStats in 3s (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => fetchSubjectStats(retryCount + 1), 3000);
      } else {
        console.error("Error fetching subject stats:", err);
      }
    }
  }, []);

  const fetchFriends = useCallback(async (retryCount = 0) => {
    setFriendsLoading(true);
    try {
      const res = await API.get("auth/friends-List");
      setFriends(res.data.friends);
    } catch (err: any) {
      if ((err?.response?.status === 503 || err?.response?.status === 500) && retryCount < 3) {
        console.warn(`⏳ Server or database not ready, retrying fetchFriends in 3s (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => fetchFriends(retryCount + 1), 3000);
      } else {
        console.error("Failed to load friends", err);
      }
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  const fetchSubjects = useCallback(async (latestMarkedSubjects: Subject[] = []) => {
    try {
      const res = await API.get(`/subject?date=${date}`);
      const allSubjects: Subject[] = res.data?.unmarkedSubjects || [];
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
  }, [date]);

  const fetchSummary = useCallback(async (retryCount = 0) => {
    setAttendanceLoading(true);
    try {
      const res = await API.get(`/attendance/summary?date=${date}`);

      // Guard: backend might return a 503-style object if DB isn't ready yet
      if (!res.data?.summary) {
        if (retryCount < 3) {
          setTimeout(() => fetchSummary(retryCount + 1), 3000);
        }
        return;
      }

      const summaryArray: Subject[] = res.data.summary || [];
      setMarkedSubjects(summaryArray);
      await fetchSubjects(summaryArray);
    } catch (error: any) {
      // Retry on 503 or 500 (server starting or DB down) — up to 3 times, 3s apart
      if ((error?.response?.status === 503 || error?.response?.status === 500) && retryCount < 3) {
        console.warn(`⏳ Server or database not ready, retrying fetchSummary in 3s (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => fetchSummary(retryCount + 1), 3000);
      } else {
        console.error('Error fetching summary:', error);
      }
    } finally {
      setAttendanceLoading(false);
    }
  }, [date, fetchSubjects]);

  const loadExistingInvites = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await API.get('/study-session/invites', { signal });
      setInvites(response.data || []);
    } catch (error: any) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        console.error('❌ Error loading invites:', error);
      }
    }
  }, [setInvites]);

  const handleAttendance = useCallback(async (subject: Subject, status: string) => {
    // Check if it was already marked to know how to rollback on failure
    const previousMarkedEntry = markedSubjects.find(s =>
      s.id === subject.id ||
      (s.subjectName || s.subject || '').toLowerCase() === (subject.subjectName || subject.subject || '').toLowerCase()
    );

    if (subject.isDummy) {
      setUnmarkedSubjects(prev => prev.filter(s => s.id !== subject.id));
      setMarkedSubjects(prev => {
        const filtered = prev.filter(s =>
          s.id !== subject.id &&
          (s.subjectName || s.subject || '').toLowerCase() !== (subject.subjectName || subject.subject || '').toLowerCase()
        );
        return [...filtered, { ...subject, status }];
      });
      toast.success(`Demo: Marked "${subject.subjectName || subject.subject}" as ${status}. Configure your actual schedule in Setup Schedule!`);
      return;
    }

    // Optimistically update the UI instantly
    setUnmarkedSubjects(prev => prev.filter(s => s.id !== subject.id));
    setMarkedSubjects(prev => {
      const filtered = prev.filter(s =>
        s.id !== subject.id &&
        (s.subjectName || s.subject || '').toLowerCase() !== (subject.subjectName || subject.subject || '').toLowerCase()
      );
      return [...filtered, { ...subject, status }];
    });

    try {
      await API.post('/attendance/mark', {
        date,
        status: [{
          subject: subject.subjectName || subject.subject,
          status
        }]
      });
      toast.success(`Successfully marked "${subject.subjectName || subject.subject}" as ${status}.`);
      fetchSubjectStats();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error(`Failed to mark attendance as ${status}.`);

      // Revert optimistic update on failure
      if (previousMarkedEntry) {
        setMarkedSubjects(prev => {
          const filtered = prev.filter(s =>
            s.id !== subject.id &&
            (s.subjectName || s.subject || '').toLowerCase() !== (subject.subjectName || subject.subject || '').toLowerCase()
          );
          return [...filtered, previousMarkedEntry];
        });
      } else {
        setMarkedSubjects(prev => prev.filter(s =>
          s.id !== subject.id &&
          (s.subjectName || s.subject || '').toLowerCase() !== (subject.subjectName || subject.subject || '').toLowerCase()
        ));
        setUnmarkedSubjects(prev => [...prev, subject]);
      }
    }
  }, [date, fetchSubjectStats, markedSubjects]);

  const markHoliday = useCallback(async () => {
    const hasDummy = unmarkedSubjects.some(s => s.isDummy);
    if (hasDummy) {
      const cancelledSubjects = unmarkedSubjects.map(s => ({ ...s, status: 'cancelled' }));
      setMarkedSubjects(prev => [...prev, ...cancelledSubjects]);
      setUnmarkedSubjects([]);
      toast.success('Demo: All classes marked as Holiday/Cancelled!');
      return;
    }

    // Save state for potential rollback
    const prevUnmarked = [...unmarkedSubjects];
    const prevMarked = [...markedSubjects];

    // Optimistically mark all unmarked subjects as cancelled
    const cancelledSubjects = unmarkedSubjects.map(s => ({ ...s, status: 'cancelled' }));
    setMarkedSubjects(prev => [...prev, ...cancelledSubjects]);
    setUnmarkedSubjects([]);

    // Don't set holidayLoading to true, keep it fast UX
    // setHolidayLoading(true); 

    try {
      const res = await API.post('/attendance/holiday', { date });
      // Sync with server in background
      fetchSummary();
      fetchSubjectStats();
      toast.success(res.data.message || '✅ Successfully marked holiday.');
    } catch (error) {
      console.error('Error marking holiday:', error);
      toast.error('❌ Failed to mark holiday.');
      // Rollback
      setUnmarkedSubjects(prevUnmarked);
      setMarkedSubjects(prevMarked);
    }
  }, [date, fetchSummary, fetchSubjectStats, unmarkedSubjects, markedSubjects]);

  const undoHoliday = useCallback(async () => {
    const hasDummy = markedSubjects.some(s => s.isDummy && s.status === 'cancelled');
    if (hasDummy) {
      const cancelledSubjects = markedSubjects.filter((s: any) => s.isDummy && s.status === 'cancelled');
      const otherMarked = markedSubjects.filter((s: any) => !s.isDummy || s.status !== 'cancelled');

      setMarkedSubjects(otherMarked);
      setUnmarkedSubjects(prev => [...prev, ...cancelledSubjects.map((s: any) => {
        const { status, ...rest } = s;
        return rest as Subject;
      })]);
      toast.success('Demo: Holiday undone successfully.');
      return;
    }

    // Save state for potential rollback
    const prevUnmarked = [...unmarkedSubjects];
    const prevMarked = [...markedSubjects];

    // Optimistically move all 'cancelled' subjects back to unmarked
    const cancelledSubjects = markedSubjects.filter((s: any) => s.status === 'cancelled');
    const otherMarked = markedSubjects.filter((s: any) => s.status !== 'cancelled');

    setMarkedSubjects(otherMarked);
    setUnmarkedSubjects(prev => [...prev, ...cancelledSubjects.map((s: any) => {
      const { status, ...rest } = s;
      return rest as Subject;
    })]);

    // Don't set holidayLoading to true, keep it fast UX
    // setHolidayLoading(true);

    try {
      const res = await API.post('/attendance/undo-holiday', { date });
      // Sync with server in background
      fetchSummary();
      fetchSubjectStats();
      toast.success(res.data.message || '↩️ Holiday undone successfully.');
    } catch (error) {
      console.error('Error undoing holiday:', error);
      toast.error('❌ Failed to undo holiday.');
      // Rollback
      setUnmarkedSubjects(prevUnmarked);
      setMarkedSubjects(prevMarked);
    }
  }, [date, fetchSummary, fetchSubjectStats, unmarkedSubjects, markedSubjects]);

  const deleteSubjectStats = useCallback(async (subjectName: string) => {
    // 1. Save current state for potential rollback
    const previousStats = [...subjectStats];

    // 2. Optimistically remove the subject from the UI immediately
    setSubjectStats(prev => prev.filter(s => 
      s.subject.toLowerCase() !== subjectName.toLowerCase()
    ));

    try {
      const res = await API.delete(`/subject/stats/${encodeURIComponent(subjectName)}`);
      toast.success(res.data.message || `Statistics for ${subjectName} deleted successfully.`);
      // 3. Sync with server silently in background
      fetchSubjectStats();
      fetchSummary();
    } catch (error) {
      console.error('Error deleting subject stats:', error);
      toast.error(`Failed to delete statistics for ${subjectName}.`);
      // 4. Revert optimistic update on failure
      setSubjectStats(previousStats);
    }
  }, [fetchSubjectStats, fetchSummary, subjectStats]);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      fetchSummary();
      fetchSubjectStats();
      fetchCalendarData();
      loadExistingInvites();
    }
  }, [fetchSummary, fetchSubjectStats, fetchCalendarData, loadExistingInvites, isAuthenticated, loading]);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      fetchFriends();
    }
  }, [fetchFriends, isAuthenticated, loading]);

  useEffect(() => {
    if (!attendanceLoading && calendarData) {
      const isScheduleEmpty = Object.values(calendarData).every((dayArr: any) => !dayArr || dayArr.length === 0);
      if (isScheduleEmpty && !hasSavedSchedule && unmarkedSubjects.length === 0 && markedSubjects.length === 0) {
        setUnmarkedSubjects(DUMMY_CLASSES);
      }
    }
  }, [calendarData, attendanceLoading, unmarkedSubjects.length, markedSubjects.length, hasSavedSchedule]);

  // Set up real-time invite socket listeners
  useEffect(() => {
    const socketInstance = socketContext?.socket;
    if (!socketInstance || !isAuthenticated || loading) return;

    const onReceiveInvite = (inviteData: any) => {
      setInvites((prev) => {
        const exists = prev.some((i) => i.id === inviteData.id);
        if (exists) return prev;

        // Show HTML5 Notification if permitted
        if (typeof window !== 'undefined' && Notification?.permission === 'granted') {
          new Notification(`Study invite from ${inviteData.name}`, {
            body: inviteData.subject || 'Join a study session',
          });
        }

        // Display an elegant toast message
        toast.info(`Study invite from ${inviteData.name}`, {
          description: `Subject: ${inviteData.subject || 'No topic'}`,
          action: {
            label: 'View',
            onClick: () => {
              router.push('/sessions');
            }
          }
        });

        return [inviteData, ...prev];
      });
    };

    const onInviteDeclined = (data: any) => {
      setInvites((prev) => prev.filter((inv) => inv.from !== data.by));
    };

    const onInviteExpired = (data: any) => {
      setInvites((prev) => prev.filter((inv) => inv.id !== data.sessionId));
    };

    socketInstance.on('receiveInvite', onReceiveInvite);
    socketInstance.on('inviteDeclined', onInviteDeclined);
    socketInstance.on('inviteExpired', onInviteExpired);

    return () => {
      socketInstance.off('receiveInvite', onReceiveInvite);
      socketInstance.off('inviteDeclined', onInviteDeclined);
      socketInstance.off('inviteExpired', onInviteExpired);
    };
  }, [socketContext?.socket, isAuthenticated, loading]);

  return (
    <Ctx.Provider value={{
      date, setDate,
      unmarkedSubjects,
      markedSubjects,
      fetchSubjects, fetchFriends, friends, friendsLoading,
      fetchSummary, attendanceLoading, holidayLoading,
      handleAttendance, markHoliday, undoHoliday, sessions, setSessions, invites,
      loadExistingInvites, setInvites,
      subjectStats, setSubjectStats, fetchSubjectStats, deleteSubjectStats,
      calendarData, setCalendarData, fetchCalendarData
    }}>
      {children}
    </Ctx.Provider>
  );
};

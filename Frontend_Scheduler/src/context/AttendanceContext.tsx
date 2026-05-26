"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '@/lib/axios';
import { toast } from 'sonner';
import moment from 'moment';
import { useSocket } from "./SocketContext";
import { useAuth } from "./authContext";
import { Subject, AttendanceContextType, SubjectStats } from '@/lib/types';

const Ctx = createContext<AttendanceContextType | null>(null);
export const useAttendance = () => useContext(Ctx);

export const AttendanceProvider = ({ children }: { children: React.ReactNode }) => {
  const socket = useSocket();
  const { isAuthenticated, loading } = useAuth();
  const [date, setDate] = useState(moment().format('YYYY-MM-DD'));
  const [unmarkedSubjects, setUnmarkedSubjects] = useState<Subject[]>([]);
  const [markedSubjects, setMarkedSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [calendarData, setCalendarData] = useState<any>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(true);

  const fetchCalendarData = useCallback(async () => {
    try {
      const res = await API.get("/schedule/calender");
      setCalendarData(res.data.schedule);
    } catch (err) {
      console.error("Error fetching calendar:", err);
    }
  }, []);

  const fetchSubjectStats = useCallback(async () => {
    try {
      const res = await API.get("/subject/stats");
      setSubjectStats(res.data.data);
    } catch (err) {
      console.error("Error fetching subject stats:", err);
    }
  }, []);

  const fetchFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const res = await API.get("auth/friends-List");
      setFriends(res.data.friends);
    } catch (err) {
      console.error("Failed to load friends", err);
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  const fetchSubjects = useCallback(async (latestMarkedSubjects: Subject[] = []) => {
    try {
      const res = await API.get(`/subject?date=${date}`);
      const allSubjects: Subject[] = res.data.unmarkedSubjects || [];
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

  const fetchSummary = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const res = await API.get(`/attendance/summary?date=${date}`);
      const summaryArray: Subject[] = res.data.summary;
      setMarkedSubjects(summaryArray);
      await fetchSubjects(summaryArray);
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setAttendanceLoading(false);
    }
  }, [date, fetchSubjects]);

  const loadExistingInvites = useCallback(async () => {
    try {
      const response = await API.get('/study-session/invites');
      console.log('📥 Loaded existing invites:', response.data);
      setInvites(response.data);
    } catch (error) {
      console.error('❌ Error loading invites:', error);
    }
  }, [setInvites]);

  const handleAttendance = useCallback(async (subject: Subject, status: string) => {
    // Optimistically update the UI instantly
    setUnmarkedSubjects(prev => prev.filter(s => s.id !== subject.id));
    setMarkedSubjects(prev => [...prev, { ...subject, status }]);

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
      setMarkedSubjects(prev => prev.filter(s => s.id !== subject.id));
      setUnmarkedSubjects(prev => [...prev, subject]);
    }
  }, [date, fetchSubjectStats]);

  const markHoliday = useCallback(async () => {
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

  useEffect(() => {
    if (isAuthenticated && !loading) {
      fetchSummary();
      fetchSubjectStats();
      fetchCalendarData();
    }
  }, [fetchSummary, fetchSubjectStats, fetchCalendarData, isAuthenticated, loading]);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      fetchFriends();
    }
  }, [fetchFriends, isAuthenticated, loading]);

  return (
    <Ctx.Provider value={{
      date, setDate,
      unmarkedSubjects,
      markedSubjects,
      fetchSubjects, fetchFriends, friends, friendsLoading,
      fetchSummary, attendanceLoading, holidayLoading,
      handleAttendance, markHoliday, undoHoliday, sessions, setSessions, invites,
      loadExistingInvites, setInvites,
      subjectStats, setSubjectStats, fetchSubjectStats,
      calendarData, setCalendarData, fetchCalendarData
    }}>
      {children}
    </Ctx.Provider>
  );
};

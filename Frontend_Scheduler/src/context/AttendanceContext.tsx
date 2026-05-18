"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '@/lib/axios';
import Swal from 'sweetalert2';
import moment from 'moment';
import { useSocket } from "./SocketContext";
import { useAuth } from "./authContext";
import { Subject, AttendanceContextType, SubjectStats } from '@/lib/types';

const Ctx = createContext<AttendanceContextType | null>(null);
export const useAttendance = () => useContext(Ctx);

export const AttendanceProvider = ({ children }: { children: React.ReactNode }) => {
  const socket = useSocket();
  const { isAuthenticated } = useAuth();
  const [date, setDate] = useState(moment().format('YYYY-MM-DD'));
  const [unmarkedSubjects, setUnmarkedSubjects] = useState<Subject[]>([]);
  const [markedSubjects, setMarkedSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [calendarData, setCalendarData] = useState<any>(null);

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
    try {
      const res = await API.get("auth/friends-List");
      setFriends(res.data.friends);
    } catch (err) {
      console.error("Failed to load friends", err);
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
    try {
      const res = await API.get(`/attendance/summary?date=${date}`);
      const summaryArray: Subject[] = res.data.summary;
      setMarkedSubjects(summaryArray);
      await fetchSubjects(summaryArray);
    } catch (error) {
      console.error('Error fetching summary:', error);
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

      // Prisma returns `id`, not `_id`
      setUnmarkedSubjects(prev => prev.filter(s => s.id !== subject.id));
      setMarkedSubjects(prev => [...prev, { ...subject, status }]);

      Swal.fire('Success', 'Attendance marked successfully.', 'success');
    } catch (error) {
      console.error('Error marking attendance:', error);
      Swal.fire('Error', 'Could not mark attendance.', 'error');
    }
  }, [date, setUnmarkedSubjects, setMarkedSubjects]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSummary();
      fetchSubjectStats();
      fetchCalendarData();
    }
  }, [fetchSummary, fetchSubjectStats, fetchCalendarData, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFriends();
    }
  }, [fetchFriends, isAuthenticated]);

  return (
    <Ctx.Provider value={{
      date, setDate,
      unmarkedSubjects,
      markedSubjects,
      fetchSubjects, fetchFriends, friends,
      fetchSummary,
      handleAttendance, sessions, setSessions, invites,
      loadExistingInvites, setInvites,
      subjectStats, setSubjectStats, fetchSubjectStats,
      calendarData, setCalendarData, fetchCalendarData
    }}>
      {children}
    </Ctx.Provider>
  );
};

"use client";

import React, { useEffect, useState } from 'react';
import { useDarkMode } from '@/context/DarkModeContext';
import { useAttendance } from '@/context/AttendanceContext';
import SubjectStatsChart from '@/components/SubjectStatsChart';
import { useAuth } from '@/context/authContext';
import TodayClasses from '@/components/dashboard/TodayClasses';
import NotesSection from '@/components/dashboard/NotesSection';
import DashboardConfirmationModals from '@/components/dashboard/DashboardConfirmationModals';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Users } from 'lucide-react';
import API from '@/lib/axios';
import { useSocket } from '@/context/SocketContext';
import PerformanceIndexChart from '@/components/dashboard/PerformanceIndexChart';
import MasterCalendar from '@/components/MasterCalendar';

const Dashboard = () => {
  const router = useRouter();
  const { darkMode } = useDarkMode() as any;
  const {
    date,
    setDate,
    unmarkedSubjects,
    markedSubjects,
    handleAttendance,
    markHoliday,
    undoHoliday,
    attendanceLoading,
    holidayLoading
  } = useAttendance() as any;

  const { isAuthenticated, emailVerified, loading, userName, profileLoading, userId: currentUserId } = useAuth() as any;

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [attendanceConfirm, setAttendanceConfirm] = useState<{ subject: any; status: string } | null>(null);
  const [holidayConfirm, setHolidayConfirm] = useState(false);
  const [undoHolidayConfirm, setUndoHolidayConfirm] = useState(false);
  const { sessions } = useSocket() as any;

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/');
      } else if (!emailVerified) {
        router.push('/verify-email');
      }
    }
  }, [isAuthenticated, emailVerified, loading, router]);

  const activeSession = React.useMemo(() => {
    if (!sessions || sessions.length === 0) return null;
    return sessions.find(
      (s: any) =>
        s.status === 'in_progress' &&
        s.participants?.some(
          (p: any) => String(p.userId || p.user?.id) === String(currentUserId) &&
            p.status === 'accepted'
        )
    ) || null;
  }, [sessions, currentUserId]);

  const dark = darkMode;
  const border = dark ? 'border-gray-800' : 'border-gray-200';
  const muted = dark ? 'text-gray-400' : 'text-gray-500';
  const cardClass = `border rounded-xl p-5 ${border} ${dark ? 'bg-black' : 'bg-white'}`;

  const primaryBtn = `px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-opacity hover:opacity-80 active:scale-95
    ${dark ? 'bg-white text-black' : 'bg-black text-white'}
    disabled:opacity-40`;

  const secondaryBtn = `px-3.5 py-1.5 rounded-lg text-[13px] font-medium border transition-colors
    ${dark
      ? 'border-gray-800 text-gray-200 hover:bg-gray-900'
      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
    } disabled:opacity-40`;

  const dangerBtn = `px-3.5 py-1.5 rounded-lg text-[13px] font-medium border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors`;

  const hasClasses = unmarkedSubjects.length > 0 || markedSubjects.length > 0;
  const isAlreadyHoliday = unmarkedSubjects.length === 0 && markedSubjects.length > 0 && markedSubjects.every((s: any) => s.status === 'cancelled');

  if (loading) {
    return (
      <div className={`min-h-screen flex justify-center items-center transition-colors duration-300 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
        <span className="inline-block w-6 h-6 rounded-full border-[2px] border-current border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 pt-[76px] md:pt-[20px] ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>

      {/* Main Container */}
      <div className="flex-1 max-w-[1100px] w-full mx-auto px-5 py-0">

        {/* Upper Dashboard header with Date Picker — sticky so it stays visible while scrolling */}
        <div className={`sticky top-0 z-20 -mx-5 px-5 py-4 mb-6 backdrop-blur-md border-b ${dark ? 'bg-black/80 border-gray-800/60' : 'bg-white/80 border-gray-200/60'
          }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {profileLoading ? (
                <div className="h-7 w-48 bg-gray-200 dark:bg-gray-850 rounded animate-pulse mb-1.5" />
              ) : (
                <h1 className="text-[22px] font-medium tracking-tight mb-1">
                  {userName ? `${userName}'s Workspace` : 'Dojo Workspace'}
                </h1>
              )}
              <p className={`text-[13px] ${muted}`}>Track classes and view weekly attendance insights</p>
            </div>

            {/* Pick Date */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCalendarOpen(!calendarOpen)}
                className={`flex items-center space-x-2 px-3.5 py-2 border rounded-lg text-[13px] font-medium transition-colors ${dark ? 'border-gray-800 hover:bg-gray-950 text-gray-200' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
              >
                <CalendarIcon className="size-4 text-gray-400" />
                <span>{date ? format(new Date(date + 'T00:00:00'), 'PPP') : 'Pick a date'}</span>
              </button>

              {calendarOpen && (
                <div className={`absolute right-0 mt-2 z-50 p-2 rounded-lg border shadow-xl ${dark ? 'bg-black border-gray-800' : 'bg-white border-gray-200'
                  }`}>
                  <Calendar
                    mode="single"
                    selected={date ? new Date(date + 'T00:00:00') : undefined}
                    onSelect={(selectedDate) => {
                      if (selectedDate) {
                        const yyyy = selectedDate.getFullYear();
                        const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                        const dd = String(selectedDate.getDate()).padStart(2, '0');
                        setDate(`${yyyy}-${mm}-${dd}`);
                      }
                      setCalendarOpen(false);
                    }}
                    className={`${dark ? 'bg-black text-white border-none' : 'bg-white text-gray-900 border-none'}`}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ongoing Session Banner */}
        {activeSession && (
          <div className={`mb-8 p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-center gap-4 relative overflow-hidden ${dark
            ? 'border-green-500/30 bg-green-500/5 text-white'
            : 'border-green-200 bg-green-50/50 text-gray-900'
            } shadow-sm animate-in fade-in duration-300`}>
            {/* Pulsing live indicator */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-green-500 absolute" />
            </div>

            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg shrink-0 ${dark ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-600'}`}>
                <Users size={20} />
              </div>
              <div>
                <p className="font-semibold text-[14.5px] tracking-tight">You&apos;re in a live session</p>
                <p className={`text-[12.5px] mt-0.5 ${muted}`}>
                  Subject: <span className="font-medium text-current">{activeSession.subject}</span> &bull; {activeSession.duration} mins
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push(`/session/${activeSession.id}/chat`)}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all hover:opacity-90 active:scale-95 shadow-md ${dark ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-green-600 text-white hover:bg-green-700'
                }`}
            >
              Return to Session
            </button>
          </div>
        )}

        <MasterCalendar />

        {/* Two column layout for Classes & Checklist */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch mb-8">
          <TodayClasses
            date={date}
            unmarkedSubjects={unmarkedSubjects}
            markedSubjects={markedSubjects}
            attendanceLoading={attendanceLoading}
            holidayLoading={holidayLoading}
            hasClasses={hasClasses}
            isAlreadyHoliday={isAlreadyHoliday}
            setUndoHolidayConfirm={setUndoHolidayConfirm}
            setHolidayConfirm={setHolidayConfirm}
            setAttendanceConfirm={setAttendanceConfirm}
            cardClass={`${cardClass} h-full`}
            border={border}
            muted={muted}
            secondaryBtn={secondaryBtn}
          />

          {/* Daily Notes (Checklist) */}
          <NotesSection date={date} cardClass={`${cardClass} h-full`} muted={muted} />
        </div>

        {/* Full-width Performance Tracker Section */}
        <div className="mb-8">
          <PerformanceIndexChart />
        </div>

        {/* Full-width Stats Section below */}
        <div className="mb-8">
          <section className={cardClass}>
            <p className={`text-[11px] uppercase tracking-widest ${muted} mb-2`}>Visual Insights</p>
            <h2 className="text-[16px] font-medium tracking-tight mb-4">Attendance Statistics</h2>
            <SubjectStatsChart />
          </section>
        </div>
      </div>

      {/* Confirmation Modals */}
      <DashboardConfirmationModals
        attendanceConfirm={attendanceConfirm}
        setAttendanceConfirm={setAttendanceConfirm}
        handleAttendance={handleAttendance}
        sessionEndConfirm={null}
        setSessionEndConfirm={() => { }}
        socket={null}
        holidayConfirm={holidayConfirm}
        setHolidayConfirm={setHolidayConfirm}
        markHoliday={markHoliday}
        undoHolidayConfirm={undoHolidayConfirm}
        setUndoHolidayConfirm={setUndoHolidayConfirm}
        undoHoliday={undoHoliday}
        date={date}
        dark={dark}
        muted={muted}
        secondaryBtn={secondaryBtn}
        primaryBtn={primaryBtn}
        dangerBtn={dangerBtn}
      />
    </div>
  );
};

export default Dashboard;
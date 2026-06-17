"use client";
 
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Undo2, Pencil, X } from 'lucide-react';
import { format } from 'date-fns';
import { useDarkMode } from '@/context/DarkModeContext';

interface TodayClassesProps {
  date: string;
  unmarkedSubjects: any[];
  markedSubjects: any[];
  attendanceLoading: boolean;
  holidayLoading: boolean;
  hasClasses: boolean;
  isAlreadyHoliday: boolean;
  setUndoHolidayConfirm: (val: boolean) => void;
  setHolidayConfirm: (val: boolean) => void;
  setAttendanceConfirm: (confirm: { subject: any; status: string } | null) => void;
  cardClass: string;
  border: string;
  muted: string;
  secondaryBtn: string;
}

const getLocalDateString = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function TodayClasses({
  date,
  unmarkedSubjects,
  markedSubjects,
  attendanceLoading,
  holidayLoading,
  hasClasses,
  isAlreadyHoliday,
  setUndoHolidayConfirm,
  setHolidayConfirm,
  setAttendanceConfirm,
  cardClass,
  border,
  muted,
  secondaryBtn,
}: TodayClassesProps) {
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;
  const isToday = date === getLocalDateString(new Date());
  const formattedDate = date ? format(new Date(date + 'T00:00:00'), 'PPP') : '';

  const [editingId, setEditingId] = useState<string | null>(null);

  // Combine unmarked and marked subjects chronologically
  const allDaySubjects = React.useMemo(() => {
    const unmarked = unmarkedSubjects.map(s => ({ ...s, isMarked: false }));
    const marked = markedSubjects.map(s => ({ ...s, isMarked: true }));
    const combined = [...unmarked, ...marked];

    // Helper to sort classes by time (e.g. "09:00 AM", "02:30 PM")
    const parseTimeToMinutes = (tStr: string) => {
      if (!tStr) return 9999;
      const match = tStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 9999;
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    return combined.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  }, [unmarkedSubjects, markedSubjects]);

  const hasDummy = unmarkedSubjects.some((s: any) => s.isDummy);
  const totalClassesCount = allDaySubjects.length;

  return (
    <section className={cardClass}>
      <p className={`text-[11px] uppercase tracking-widest ${muted} mb-2`}>Schedule & Attendance</p>
      
      <h2 className="text-[16px] font-medium tracking-tight mb-4 flex justify-between items-center">
        <span>{isToday ? "Today's Classes" : `Classes on ${formattedDate}`}</span>
        
        <div className="flex items-center gap-2">
          {hasClasses && (
            isAlreadyHoliday ? (
              <Button
                size="xs"
                variant="outline"
                onClick={() => setUndoHolidayConfirm(true)}
                className="gap-1 border-green-500/30 text-green-500 bg-green-500/5 hover:bg-green-500/15 hover:text-green-400"
              >
                <Undo2 className="size-3" />
                🎉 Holiday — Undo?
              </Button>
            ) : (
              <Button
                size="xs"
                variant="outline"
                onClick={() => setHolidayConfirm(true)}
                className="gap-1 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
              >
                <Sun className="size-3" />
                Mark Holiday
              </Button>
            )
          )}
          
          <span className={`text-[11px] px-2 py-0.5 rounded border ${border} ${muted}`}>
            {totalClassesCount} classes
          </span>
        </div>
      </h2>
      
      {/* Classes content */}
      {(attendanceLoading || holidayLoading) ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${border}`}>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/5"></div>
                <div className="h-3 bg-gray-100 dark:bg-gray-900/50 rounded w-1/4"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-7 w-20 bg-gray-100 dark:bg-gray-900/50 rounded-lg"></div>
                <div className="h-7 w-16 bg-gray-100 dark:bg-gray-900/50 rounded-lg"></div>
                <div className="h-7 w-22 bg-gray-100 dark:bg-gray-900/50 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      ) : allDaySubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 dark:bg-zinc-950/10">
          <div className={`p-2.5 rounded-full mb-2.5 ${dark ? 'bg-zinc-950 text-zinc-500 border border-zinc-800' : 'bg-zinc-50 text-zinc-400 border border-zinc-100'}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <p className={`text-[12.5px] font-semibold ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>No classes scheduled</p>
          <p className={`text-[11.5px] ${muted} max-w-[220px] mt-0.5 leading-normal`}>
            {isToday ? "Enjoy your day off! No classes are scheduled for today." : `No classes are scheduled on ${formattedDate}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {hasDummy && (
            <div className={`p-4 rounded-xl border border-dashed flex flex-col gap-2 ${
              dark 
                ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-300' 
                : 'border-indigo-200 bg-indigo-50 text-indigo-800'
            }`}>
              <div className="flex items-center gap-2 font-medium text-[13px]">
                <span className="text-[15px]">💡</span>
                <span>New to Dojo? Try Marking Attendance!</span>
              </div>
              <p className={`text-[12px] leading-relaxed ${dark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                We&apos;ve loaded some <strong>demo classes</strong> for you below. Tap <strong>Attended</strong>, <strong>Missed</strong>, or <strong>Cancelled</strong> to see how attendance logging works. 
                Once you&apos;re ready, set up your real timetable under <strong>Add Classes</strong> in the sidebar.
              </p>
            </div>
          )}

          {allDaySubjects.map((subject: any) => {
            const isEditing = editingId === (subject._id || subject.id);
            const showActions = !subject.isMarked || isEditing;

            return (
              <div
                key={subject._id || subject.id}
                className={`border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors ${border} ${
                  subject.isMarked && !isEditing
                    ? dark ? 'bg-zinc-950/20' : 'bg-gray-50/40'
                    : ''
                }`}
              >
                <div>
                  <p className="font-medium text-[15px]">{subject.subjectName || subject.subject}</p>
                  <p className={`text-[12px] mt-0.5 ${muted}`}>{subject.time}</p>
                </div>

                <div className="flex items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
                  {showActions ? (
                    <div className="flex gap-2 flex-wrap items-center">
                      {['attended', 'missed', 'cancelled'].map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            setAttendanceConfirm({ subject, status });
                            setEditingId(null); // Reset edit view
                          }}
                          className={secondaryBtn}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}

                      {/* Cancel edit button */}
                      {isEditing && (
                        <button
                          onClick={() => setEditingId(null)}
                          className={`p-1.5 rounded-lg border hover:bg-red-500/10 hover:text-red-500 transition-colors ${border}`}
                          title="Cancel editing"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {/* Marked status badge */}
                      <span
                        className={`px-3 py-1 rounded-full border text-[10px] uppercase font-medium tracking-wider ${
                          subject.status === 'attended'
                            ? 'border-green-500/30 text-green-500 bg-green-500/5 dark:bg-green-500/10'
                            : subject.status === 'missed'
                              ? 'border-red-500/30 text-red-500 bg-red-500/5 dark:bg-red-500/10'
                              : 'border-zinc-500/30 text-zinc-550 bg-zinc-500/5 dark:bg-zinc-550/10'
                        }`}
                      >
                        {subject.status}
                      </span>

                      {/* Change/Edit button */}
                      <button
                        onClick={() => setEditingId(subject._id || subject.id)}
                        className={`p-1.5 rounded-lg border hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors ${border} ${muted}`}
                        title="Change attendance"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

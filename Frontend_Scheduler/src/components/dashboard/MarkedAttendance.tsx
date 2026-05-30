"use client";
 
import React from 'react';
import { format } from 'date-fns';
import { useDarkMode } from '@/context/DarkModeContext';

interface MarkedAttendanceProps {
  date: string;
  markedSubjects: any[];
  attendanceLoading: boolean;
  holidayLoading: boolean;
  cardClass: string;
  border: string;
  muted: string;
}

const getLocalDateString = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function MarkedAttendance({
  date,
  markedSubjects,
  attendanceLoading,
  holidayLoading,
  cardClass,
  border,
  muted,
}: MarkedAttendanceProps) {
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;
  const isToday = date === getLocalDateString(new Date());
  const formattedDate = date ? format(new Date(date + 'T00:00:00'), 'PPP') : '';

  return (
    <section className={cardClass}>
      <p className={`text-[11px] uppercase tracking-widest ${muted} mb-2`}>Attendance Logs</p>
      <h2 className="text-[16px] font-medium tracking-tight mb-4">
        {isToday ? "Marked Attendance" : `Marked on ${formattedDate}`}
      </h2>
      
      {(attendanceLoading || holidayLoading) ? (
        <div className="space-y-2.5 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className={`border rounded-lg p-3.5 flex justify-between items-center ${border}`}>
              <div className="space-y-1.5">
                <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded w-28"></div>
                <div className="h-3 bg-gray-100 dark:bg-gray-900/50 rounded w-16"></div>
              </div>
              <div className="h-6 w-18 bg-gray-100 dark:bg-gray-900/50 rounded-full"></div>
            </div>
          ))}
        </div>
      ) : markedSubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 dark:bg-zinc-950/10">
          <div className={`p-2.5 rounded-full mb-2.5 ${dark ? 'bg-zinc-950 text-zinc-500 border border-zinc-800' : 'bg-zinc-50 text-zinc-400 border border-zinc-100'}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </div>
          <p className={`text-[12.5px] font-semibold ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>No marked logs</p>
          <p className={`text-[11.5px] ${muted} max-w-[220px] mt-0.5 leading-normal`}>
            {isToday ? "No attendance marked yet. Log classes above to get started." : `No attendance marked on ${formattedDate}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {markedSubjects.map((subject: any) => (
            <div
              key={subject._id || subject.id}
              className={`border rounded-lg p-3.5 flex justify-between items-center ${border}`}
            >
              <div>
                <p className="font-medium text-[14px]">{subject.subject}</p>
                <p className={`text-[12px] mt-0.5 ${muted}`}>{subject.time}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full border text-[10px] uppercase font-medium tracking-wider ${
                  subject.status === 'attended'
                    ? 'border-green-500/30 text-green-500 bg-green-500/5'
                    : subject.status === 'missed'
                      ? 'border-red-500/30 text-red-500 bg-red-500/5'
                      : 'border-gray-500/30 text-gray-500 bg-gray-500/5'
                }`}
              >
                {subject.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

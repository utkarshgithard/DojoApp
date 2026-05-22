"use client";
 
import React from 'react';
import { format } from 'date-fns';

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
        <p className={`text-[13px] ${muted} py-4`}>
          {isToday ? "No attendance marked yet." : `No attendance marked on ${formattedDate}.`}
        </p>
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

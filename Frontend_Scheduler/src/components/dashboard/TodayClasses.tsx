"use client";
 
import React from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Undo2 } from 'lucide-react';
import { format } from 'date-fns';

interface TodayClassesProps {
  date: string;
  unmarkedSubjects: any[];
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
  const isToday = date === getLocalDateString(new Date());
  const formattedDate = date ? format(new Date(date + 'T00:00:00'), 'PPP') : '';

  return (
    <section className={cardClass}>
      <p className={`text-[11px] uppercase tracking-widest ${muted} mb-2`}>Schedule</p>
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
            {unmarkedSubjects.length} classes
          </span>
        </div>
      </h2>
      
      {/* Today's Classes content with skeleton */}
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
      ) : unmarkedSubjects.length === 0 ? (
        <p className={`text-[13px] ${muted} py-4`}>
          {isToday ? "No classes scheduled for today." : `No classes scheduled on ${formattedDate}.`}
        </p>
      ) : (
        <div className="space-y-3">
          {unmarkedSubjects.map((subject: any) => (
            <div
              key={subject._id || subject.id}
              className={`border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${border}`}
            >
              <div>
                <p className="font-medium text-[15px]">{subject.subjectName || subject.subject}</p>
                <p className={`text-[12px] mt-0.5 ${muted}`}>{subject.time}</p>
              </div>
              <div className="flex gap-2 flex-wrap mt-2 sm:mt-0">
                {['attended', 'missed', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setAttendanceConfirm({ subject, status })}
                    className={secondaryBtn}
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
  );
}

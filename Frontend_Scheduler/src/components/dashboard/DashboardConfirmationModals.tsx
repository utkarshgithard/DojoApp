"use client";

import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Sun, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardConfirmationModalsProps {
  attendanceConfirm: { subject: any; status: string } | null;
  setAttendanceConfirm: (confirm: { subject: any; status: string } | null) => void;
  handleAttendance: (subject: any, status: string) => Promise<void>;
  sessionEndConfirm: { sessionId: string } | null;
  setSessionEndConfirm: (confirm: { sessionId: string } | null) => void;
  socket: any;
  holidayConfirm: boolean;
  setHolidayConfirm: (val: boolean) => void;
  markHoliday: () => Promise<void>;
  undoHolidayConfirm: boolean;
  setUndoHolidayConfirm: (val: boolean) => void;
  undoHoliday: () => Promise<void>;
  date: string;
  dark: boolean;
  muted: string;
  secondaryBtn: string;
  primaryBtn: string;
  dangerBtn: string;
}

export default function DashboardConfirmationModals({
  attendanceConfirm,
  setAttendanceConfirm,
  handleAttendance,
  sessionEndConfirm,
  setSessionEndConfirm,
  socket,
  holidayConfirm,
  setHolidayConfirm,
  markHoliday,
  undoHolidayConfirm,
  setUndoHolidayConfirm,
  undoHoliday,
  date,
  dark,
  muted,
  secondaryBtn,
  primaryBtn,
  dangerBtn,
}: DashboardConfirmationModalsProps) {
  return (
    <>
      {/* Premium Custom Confirmation Dialog for Marking Attendance */}
      {attendanceConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className={`rounded-xl border p-6 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
            dark ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="mb-4">
              <h3 className="text-[16px] font-medium tracking-tight">Confirm Attendance Change</h3>
              <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
                Are you sure you want to mark <span className="font-semibold text-current">{attendanceConfirm.subject.subjectName || attendanceConfirm.subject.subject}</span> as <span className="font-semibold text-current capitalize">{attendanceConfirm.status}</span>?
              </p>
            </div>
            <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-gray-100 dark:border-gray-900">
              <button
                type="button"
                onClick={() => setAttendanceConfirm(null)}
                className={secondaryBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { subject, status } = attendanceConfirm;
                  setAttendanceConfirm(null);
                  await handleAttendance(subject, status);
                }}
                className={primaryBtn}
              >
                Yes, Mark
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Custom Confirmation Dialog for Ending Sessions */}
      {sessionEndConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className={`rounded-xl border p-6 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
            dark ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="mb-4">
              <h3 className="text-[16px] font-medium tracking-tight text-red-500">End Study Session?</h3>
              <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
                This will end the session for all participants. Are you sure you want to proceed?
              </p>
            </div>
            <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-gray-100 dark:border-gray-900">
              <button
                type="button"
                onClick={() => setSessionEndConfirm(null)}
                className={secondaryBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const { sessionId } = sessionEndConfirm;
                  setSessionEndConfirm(null);
                  socket?.emit('endSession', { sessionId });
                  toast.success("Study session ended successfully.");
                }}
                className={dangerBtn}
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Premium Custom Confirmation Dialog for Holiday */}
      {holidayConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className={`rounded-xl border p-6 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
            dark ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="mb-4">
              <h3 className="text-[16px] font-medium tracking-tight text-amber-500 flex items-center gap-2">
                <Sun className="size-5" />
                Declare Holiday?
              </h3>
              <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
                Are you sure you want to mark all classes on <span className="font-semibold text-current">{date ? format(new Date(date + 'T00:00:00'), 'PPP') : 'this day'}</span> as cancelled? This will overwrite any existing attendance marks for today.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-gray-100 dark:border-gray-900">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHolidayConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  setHolidayConfirm(false);
                  await markHoliday();
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Sun className="size-3.5" />
                Confirm Holiday
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Holiday Confirmation Modal */}
      {undoHolidayConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className={`rounded-xl border p-6 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
            dark ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="mb-4">
              <h3 className="text-[16px] font-medium tracking-tight text-green-500 flex items-center gap-2">
                <Undo2 className="size-5" />
                Undo Holiday?
              </h3>
              <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
                This will remove all <span className="font-semibold text-current">cancelled</span> entries for <span className="font-semibold text-current">{date ? format(new Date(date + 'T00:00:00'), 'PPP') : 'this day'}</span>, returning those classes to unmarked. Any individually marked entries (attended / missed) will not be affected.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-gray-100 dark:border-gray-900">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUndoHolidayConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  setUndoHolidayConfirm(false);
                  await undoHoliday();
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Undo2 className="size-3.5" />
                Yes, Undo Holiday
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

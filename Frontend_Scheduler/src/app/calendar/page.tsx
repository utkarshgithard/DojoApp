"use client";

import React, { useEffect, useState } from "react";
import API from "@/lib/axios";
import { useAuth } from "@/context/authContext";
import { useAttendance } from "@/context/AttendanceContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Calendar } from "lucide-react";

const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export default function CalendarPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth() as any;
  const { calendarData: schedule, setCalendarData: setSchedule, fetchSummary } = useAttendance() as any;
  const { darkMode } = useDarkMode() as any;
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ subjectId: string; subjectName: string; day: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleDeleteSubject = async (subjectId: string, day: string) => {
    try {
      await API.delete(`/schedule/${subjectId}/${day}`);
      setSchedule((prev: any) => ({
        ...prev,
        [day]: prev[day].filter((sub: any) => (sub.id || sub._id) !== subjectId)
      }));
      await fetchSummary();
      toast.success("Subject removed from schedule.");
    } catch (err) {
      console.error("Failed to delete subject:", err);
      toast.error("Failed to delete subject.");
    }
  };

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

  if (authLoading || !schedule) {
    return (
      <div className={`min-h-screen flex justify-center items-center transition-colors duration-300 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
        <span className="inline-block w-6 h-6 rounded-full border-[2px] border-current border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 pt-[96px] pb-16 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      <div className="max-w-[1100px] w-full mx-auto px-5">
        
        {/* Page Header */}
        <div className="mb-8 border-b pb-5 border-gray-100 dark:border-gray-900">
          <p className={`text-[11px] uppercase tracking-widest ${muted} mb-1 flex items-center gap-1.5`}>
            <Calendar size={12} />
            <span>Time planner</span>
          </p>
          <h1 className="text-[22px] font-medium tracking-tight">Study Calendar</h1>
          <p className={`text-[13px] ${muted} mt-0.5`}>Overview of your weekly classes. Click any card to remove it from your schedule.</p>
        </div>

        {/* Calendar Weekly Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {daysOfWeek.map((day) => {
            const subjects = schedule[day] || [];
            
            return (
              <section key={day} className={cardClass}>
                <h2 className="text-[14px] font-medium tracking-tight mb-4 flex justify-between items-center border-b pb-2.5 border-gray-50 dark:border-gray-900">
                  <span className="capitalize">{day}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded border ${border} ${muted}`}>
                    {subjects.length} {subjects.length === 1 ? 'class' : 'classes'}
                  </span>
                </h2>

                {subjects.length > 0 ? (
                  <div className="space-y-2.5">
                    {subjects.map((subject: any, idx: number) => {
                      const subjectId = subject.id || subject._id;
                      const name = subject.name || subject.subjectName || subject.subject;
                      
                      return (
                        <div
                          key={`${subjectId}-${idx}`}
                          onClick={() => {
                            if (subjectId) {
                              setDeleteConfirm({ subjectId, subjectName: name, day });
                            }
                          }}
                          className={`group w-full text-left flex justify-between items-center gap-2 border ${border} rounded-lg p-3 bg-transparent hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/5 transition-all duration-200 cursor-pointer`}
                          title="Click to remove from schedule"
                        >
                          <div className="truncate">
                            <p className="font-medium text-[13.5px] truncate">{name}</p>
                            {subject.time && (
                              <p className={`text-[11px] mt-0.5 group-hover:text-red-400 ${muted}`}>{subject.time}</p>
                            )}
                          </div>
                          <span className="opacity-0 group-hover:opacity-100 p-1 rounded-full text-red-500 transition-opacity">
                            <X size={13} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={`text-[12.5px] ${muted} italic py-2`}>No classes scheduled.</p>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className={`rounded-xl border p-6 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
            dark ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="mb-4">
              <h3 className="text-[16px] font-medium tracking-tight text-red-500">Remove Class from Calendar?</h3>
              <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
                Are you sure you want to remove <span className="font-semibold text-current">{deleteConfirm.subjectName}</span> from <span className="font-semibold text-current capitalize">{deleteConfirm.day}</span>? This will modify your weekly recurring schedule.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-gray-100 dark:border-gray-900">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className={secondaryBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { subjectId, day } = deleteConfirm;
                  setDeleteConfirm(null);
                  await handleDeleteSubject(subjectId, day);
                }}
                className={primaryBtn}
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

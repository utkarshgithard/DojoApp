"use client";

import React, { useEffect, useState } from "react";
import API from "@/lib/axios";
import { useAuth } from "@/context/authContext";
import { useAttendance } from "@/context/AttendanceContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Clock, Plus, Trash2, ChevronRight } from "lucide-react";
import { TimePicker } from "@/components/ui/time-picker";

const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Title Case helper to normalize subject casing
function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Consistent color tagging based on subject name hashing
const getSubjectColor = (name: string) => {
  const colors = [
    { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-900/50', dot: 'bg-indigo-500' },
    { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900/50', dot: 'bg-emerald-500' },
    { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900/50', dot: 'bg-amber-500' },
    { bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-900/50', dot: 'bg-rose-500' },
    { bg: 'bg-sky-50 dark:bg-sky-950/30', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-900/50', dot: 'bg-sky-500' },
    { bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-900/50', dot: 'bg-violet-500' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Helper to convert 24h string ("09:00") to 12h AM/PM ("09:00 AM")
const formatTo12Hour = (time24: string) => {
  if (!time24) return "";
  const [hourStr, minStr] = time24.split(":");
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  hour = hour ? hour : 12; // '0' should be '12'
  return `${hour.toString().padStart(2, '0')}:${minStr} ${ampm}`;
};

// Helper to convert 12h AM/PM ("09:00 AM") to 24h string ("09:00")
const parseTo24Hour = (time12: string) => {
  if (!time12) return "";
  const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return "";
  let [_, hourStr, minStr, ampm] = match;
  let hour = parseInt(hourStr, 10);
  if (ampm.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${minStr}`;
};

export default function CalendarPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth() as any;
  const { calendarData, setCalendarData, fetchCalendarData, fetchSummary } = useAttendance() as any;
  const { darkMode } = useDarkMode() as any;

  const [activeTab, setActiveTab] = useState<'view' | 'setup'>('view');
  const [activeSetupDay, setActiveSetupDay] = useState<string>("monday");
  const [deleteConfirm, setDeleteConfirm] = useState<{ subjectId: string; subjectName: string; day: string } | null>(null);

  // Dynamic positioning state for the day selection liquid glass capsule
  const [dayCapsuleStyle, setDayCapsuleStyle] = useState({ left: 0, width: 0 });
  
  // Track open state of Start Time pickers to dynamically hide End Time fields
  const [openStartPickers, setOpenStartPickers] = useState<{ [key: number]: boolean }>({});

  // Setup schedule state (using native time strings)
  const [setupSchedule, setSetupSchedule] = useState<any>(
    weekdays.reduce((acc: any, day) => {
      acc[day] = [{
        subject: '',
        startTime: '',
        endTime: ''
      }];
      return acc;
    }, {})
  );
  
  // Track original schedule to disable/dim the Save button if no changes exist
  const [originalSchedule, setOriginalSchedule] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  // Dynamically measure the active day button to position the liquid glass capsule
  useEffect(() => {
    if (activeTab === 'setup') {
      // Small timeout to ensure DOM has updated
      const timer = setTimeout(() => {
        const activeBtn = document.getElementById(`day-btn-${activeSetupDay}`);
        if (activeBtn) {
          setDayCapsuleStyle({
            left: activeBtn.offsetLeft,
            width: activeBtn.clientWidth,
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeSetupDay, activeTab]);

  // Pre-fill forms with existing data from DB
  useEffect(() => {
    if (calendarData) {
      const initialSetup = weekdays.reduce((acc: any, day) => {
        const dayClasses = calendarData[day] || [];
        if (dayClasses.length > 0) {
          acc[day] = dayClasses.map((cls: any) => {
            let startTime = "";
            let endTime = "";
            if (cls.time) {
              const parts = cls.time.split(" - ");
              if (parts.length === 2) {
                startTime = parseTo24Hour(parts[0]) || "";
                endTime = parseTo24Hour(parts[1]) || "";
              }
            }
            return {
              subject: cls.name || cls.subjectName || cls.subject || "",
              startTime,
              endTime
            };
          });
        } else {
          acc[day] = [{ subject: "", startTime: "", endTime: "" }];
        }
        return acc;
      }, {});
      setSetupSchedule(initialSetup);
      setOriginalSchedule(JSON.stringify(initialSetup));
    }
  }, [calendarData]);

  // View Calendar Handlers
  const handleDeleteSubject = async (subjectId: string, day: string) => {
    try {
      await API.delete(`/schedule/${subjectId}/${day}`);
      setCalendarData((prev: any) => ({
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

  // Setup Schedule Handlers
  const handleSetupChange = (day: string, index: number, field: string, value: string) => {
    const updated = [...setupSchedule[day]];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setSetupSchedule({ ...setupSchedule, [day]: updated });
  };

  const addClass = (day: string) => {
    setSetupSchedule({
      ...setupSchedule,
      [day]: [
        ...setupSchedule[day],
        {
          subject: '',
          startTime: '',
          endTime: ''
        }
      ]
    });
  };

  const removeClass = (day: string, index: number) => {
    const updated = [...setupSchedule[day]];
    updated.splice(index, 1);
    setSetupSchedule({ ...setupSchedule, [day]: updated });
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const formattedSchedule: any = {};
    for (const day of weekdays) {
      const validClasses = setupSchedule[day]
        .filter((cls: any) => cls.subject.trim() !== '' && cls.startTime !== '' && cls.endTime !== '')
        .map((cls: any) => ({
          subjectName: toTitleCase(cls.subject.trim()),
          time: `${formatTo12Hour(cls.startTime)} - ${formatTo12Hour(cls.endTime)}`
        }));

      if (validClasses.length > 0) {
        if (!formattedSchedule[day]) {
          formattedSchedule[day] = [];
        }
        formattedSchedule[day].push(...validClasses);
      }
    }

    try {
      await API.post('/schedule', { weeklySchedule: formattedSchedule });
      await fetchCalendarData();
      await fetchSummary();
      toast.success('Weekly schedule saved!');
      setActiveTab('view');
    } catch (err) {
      toast.error('Failed to save weekly schedule.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const dark = darkMode;
  const border = dark ? 'border-zinc-800' : 'border-zinc-200';
  const muted = dark ? 'text-zinc-400' : 'text-zinc-500';
  const cardClass = `border rounded-lg md:p-5 sm:p-2.5 p-1.5 ${border} ${dark ? 'bg-zinc-950/30' : 'bg-white'} shadow-sm`;

  const primaryBtn = `px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed`;
  const secondaryBtn = `px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border ${border} transition-all active:scale-[0.98] flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed`;
  const inputClass = `w-full px-3.5 py-2 text-sm rounded-xl border outline-none transition-all duration-205 ${dark
    ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20'
    : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-455 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20'
    }`;

  const hasUnsavedChanges = JSON.stringify(setupSchedule) !== originalSchedule;

  if (authLoading || (activeTab === 'view' && !calendarData)) {
    return (
      <div className={`min-h-screen flex justify-center items-center transition-colors duration-300 ${dark ? 'bg-black text-white' : 'bg-white text-zinc-900'}`}>
        <span className="inline-block w-6 h-6 rounded-full border-[2px] border-current border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 pt-[55px] md:pt-[24px] pb-32 ${dark ? 'bg-black text-white' : 'bg-white text-zinc-900'}`}>
      <div className="max-w-[1100px] w-full mx-auto px-5">

        {/* Page Header with Tabs */}
        <div className="mb-4 border-b pb-4 pt-2 border-zinc-100 dark:border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className={`text-[11px] uppercase tracking-widest ${muted} mb-1 flex items-center gap-1.5`}>
              <Calendar size={12} />
              <span>Time planner</span>
            </p>
            <h1 className="text-[22px] font-semibold tracking-tight">Class Schedule</h1>

          </div>

          <div
            className={`relative flex p-1 rounded-2xl border self-start sm:self-auto select-none overflow-hidden ${dark
              ? 'bg-zinc-900/40 border-white/[0.08]'
              : 'bg-white/40 border-white/60'
              }`}
            style={{
              width: '244px',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              boxShadow: dark
                ? 'inset 0 1px 1px rgba(255,255,255,0.06), inset 0 -1px 1px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.25)'
                : 'inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -1px 1px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
            }}
          >
            {/* Glass sheen overlay */}
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{
                background: dark
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 40%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 40%)',
              }}
            />

            {/* Liquid Glass Sliding Capsule */}
            <div
              className="absolute top-1 bottom-1 rounded-xl border"
              style={{
                left: activeTab === 'view' ? '4px' : '122px',
                width: '116px',
                transition: 'left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                background: dark
                  ? 'linear-gradient(180deg, rgba(60,60,65,0.95) 0%, rgba(40,40,45,0.95) 100%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(245,245,247,0.9) 100%)',
                borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: dark
                  ? '0 2px 8px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0.5px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.2)'
                  : '0 2px 8px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06), inset 0 1px 0.5px rgba(255,255,255,1), inset 0 -1px 1px rgba(0,0,0,0.03)',
              }}
            >
              {/* Capsule top sheen */}
              <div
                className="absolute inset-x-0 top-0 h-1/2 rounded-t-xl pointer-events-none"
                style={{
                  background: dark
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)',
                }}
              />
            </div>

            <button
              onClick={() => setActiveTab('view')}
              className={`relative z-10 py-1.5 rounded-xl text-[13px] font-medium w-[120px] text-center ${activeTab === 'view'
                ? (dark ? 'text-white' : 'text-zinc-900')
                : (dark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-900')
                }`}
              style={{ transition: 'color 0.3s ease' }}
            >
              View Calendar
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className={`relative z-10 py-1.5 rounded-xl text-[13px] font-medium w-[120px] text-center ${activeTab === 'setup'
                ? (dark ? 'text-white' : 'text-zinc-900')
                : (dark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-900')
                }`}
              style={{ transition: 'color 0.3s ease' }}
            >
              Add Classes
            </button>
          </div>
        </div>

        {activeTab === 'view' ? (
          /* Calendar Weekly Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {weekdays.map((day) => {
              const subjects = calendarData?.[day] || [];

              return (
                <section key={day} className={cardClass}>
                  <h2 className="text-[14px] font-semibold tracking-tight mb-4 flex justify-between items-center border-b pb-2.5 border-zinc-100 dark:border-zinc-900">
                    <span className="capitalize">{day}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${border} ${muted}`}>
                      {subjects.length} {subjects.length === 1 ? 'class' : 'classes'}
                    </span>
                  </h2>

                  {subjects.length > 0 ? (
                    <div className="space-y-2.5">
                      {subjects.map((subject: any, idx: number) => {
                        const subjectId = subject.id || subject._id;
                        const name = subject.name || subject.subjectName || subject.subject;
                        const colors = getSubjectColor(name);

                        return (
                          <div
                            key={`${subjectId}-${idx}`}
                            className={`group w-full flex justify-between items-center gap-2 border ${colors.border} rounded-xl p-3 ${colors.bg} transition-all duration-200`}
                          >
                            <div className="truncate flex items-start gap-2.5">
                              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${colors.dot}`} />
                              <div className="truncate">
                                <p className={`font-semibold text-[13.5px] truncate ${colors.text}`}>{name}</p>
                                {subject.time && (
                                  <p className={`text-[11px] mt-0.5 ${dark ? 'text-zinc-450' : 'text-zinc-500'}`}>{subject.time}</p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (subjectId) {
                                  setDeleteConfirm({ subjectId, subjectName: name, day });
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/15 text-zinc-400 hover:text-rose-500 transition-all duration-200 shrink-0"
                              title="Remove from schedule"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Compact Empty State */
                    <div className="flex flex-col items-center justify-center py-5 px-4 border border-dashed rounded-xl border-zinc-200 dark:border-zinc-800 text-center">
                      <p className={`text-xs ${muted} mb-2`}>No classes scheduled</p>
                      <button
                        onClick={() => {
                          setActiveSetupDay(day);
                          setActiveTab('setup');
                        }}
                        className="text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Plus size={12} /> Add Class
                      </button>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          /* Setup Schedule Form - One Day at a Time Flow */
          <form onSubmit={handleSetupSubmit} className=" animate-in fade-in duration-300">

            {/* Premium Sticky Day Navigation Tab Bar */}
            <div className="sticky top-0 z-25 mb-6 -mx-5 px-5">
              <style dangerouslySetInnerHTML={{
                __html: `
                .no-scrollbar::-webkit-scrollbar {
                  display: none;
                }
              `}} />

              {/* Left & Right Fade Indicators */}
              <div className={`absolute left-5 top-1.5 bottom-1.5 w-8 bg-gradient-to-r ${dark ? 'from-black' : 'from-white'} to-transparent pointer-events-none z-30`} />
              <div className={`absolute right-5 top-1.5 bottom-1.5 w-8 bg-gradient-to-l ${dark ? 'from-black' : 'from-white'} to-transparent pointer-events-none z-30`} />

              <div
                className={`relative flex gap-2 p-1.5 rounded-2xl border ${border} ${dark ? 'bg-zinc-950/40 border-white/[0.08]' : 'bg-white/40 border-white/60'
                  } backdrop-blur-xl overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth`}
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  boxShadow: dark
                    ? 'inset 0 1px 1px rgba(255,255,255,0.06), inset 0 -1px 1px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.25)'
                    : 'inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -1px 1px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)'
                }}
              >
                {/* Liquid Glass Sliding Capsule for Day Selection */}
                {dayCapsuleStyle.width > 0 && (
                  <div
                    className="absolute top-1.5 bottom-1.5 rounded-xl border pointer-events-none"
                    style={{
                      left: `${dayCapsuleStyle.left}px`,
                      width: `${dayCapsuleStyle.width}px`,
                      transition: 'left 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      background: dark
                        ? 'linear-gradient(180deg, rgba(60,60,65,0.95) 0%, rgba(40,40,45,0.95) 100%)'
                        : 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(245,245,247,0.9) 100%)',
                      borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      boxShadow: dark
                        ? '0 2px 8px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0.5px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.2)'
                        : '0 2px 8px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06), inset 0 1px 0.5px rgba(255,255,255,1), inset 0 -1px 1px rgba(0,0,0,0.03)',
                    }}
                  >
                    {/* Capsule top sheen */}
                    <div
                      className="absolute inset-x-0 top-0 h-1/2 rounded-t-xl pointer-events-none"
                      style={{
                        background: dark
                          ? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)'
                          : 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)',
                      }}
                    />
                  </div>
                )}

                {weekdays.map((day) => {
                  const count = setupSchedule[day].filter((cls: any) => cls.subject.trim() !== '').length;
                  const isActive = activeSetupDay === day;
                  return (
                    <button
                      key={day}
                      id={`day-btn-${day}`}
                      type="button"
                      onClick={() => setActiveSetupDay(day)}
                      className={`snap-center px-4 py-2 rounded-xl text-[12.5px] font-semibold capitalize transition-all duration-300 whitespace-nowrap flex items-center gap-2 select-none shrink-0 relative z-10 ${isActive
                        ? (dark ? 'text-white' : 'text-zinc-900')
                        : dark
                          ? 'text-zinc-400 hover:text-zinc-200'
                          : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                    >
                      <span>{day}</span>
                      {count > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-all ${isActive
                          ? (dark ? 'bg-zinc-800 text-white border border-zinc-700/50' : 'bg-zinc-200 text-zinc-800 border border-zinc-300')
                          : 'bg-indigo-55/10 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400'
                          }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Day Card */}
            <div className={cardClass}>
              <h3 className="capitalize font-semibold text-[15px] tracking-tight mb-5 flex justify-between items-center border-b pb-2.5 border-zinc-100 dark:border-zinc-900">
                <span>  {activeSetupDay}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${border} ${muted}`}>
                  {setupSchedule[activeSetupDay].filter((cls: any) => cls.subject.trim() !== '').length} Active Classes
                </span>
              </h3>

              <div className="space-y-4">
                {setupSchedule[activeSetupDay].map((item: any, idx: number) => {
                  const isSubjectFilled = item.subject.trim() !== "";
                  const isStartFilled = item.startTime.trim() !== "";
                  const isStartOpen = !!openStartPickers[idx];

                  return (
                    <div key={idx} className="flex flex-col gap-3.5 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/20 dark:bg-zinc-950/10 transition-all duration-305">
                      
                      {/* Step 1: Subject Input */}
                      <div className="w-full">
                        <input
                          type="text"
                          placeholder="Enter subject name..."
                          value={item.subject}
                          onChange={(e) => handleSetupChange(activeSetupDay, idx, 'subject', e.target.value)}
                          className={inputClass}
                        />
                      </div>

                      {/* Step 2: Start Time (Progressive Reveal) */}
                      <div 
                        className={`flex flex-col gap-1.5 w-full transition-all duration-300 origin-top ${
                          isSubjectFilled
                            ? "max-h-24 opacity-100 scale-y-100 translate-y-0"
                            : "max-h-0 opacity-0 scale-y-95 -translate-y-2 overflow-hidden pointer-events-none"
                        }`}
                      >
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${muted}`}>Start Time</span>
                        <TimePicker
                          value={item.startTime}
                          onChange={(val) => handleSetupChange(activeSetupDay, idx, 'startTime', val)}
                          onOpenChange={(open) => setOpenStartPickers(prev => ({ ...prev, [idx]: open }))}
                        />
                      </div>

                      {/* Step 3: End Time & Delete Button (Progressive Reveal - hides when Start Time is being edited) */}
                      <div 
                        className={`flex items-end gap-3 w-full transition-all duration-300 origin-top ${
                          isSubjectFilled && isStartFilled && !isStartOpen
                            ? "max-h-24 opacity-100 scale-y-100 translate-y-0"
                            : "max-h-0 opacity-0 scale-y-95 -translate-y-2 overflow-hidden pointer-events-none"
                        }`}
                      >
                        <div className="flex-1 flex flex-col gap-1.5">
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${muted}`}>End Time</span>
                          <TimePicker
                            value={item.endTime}
                            onChange={(val) => handleSetupChange(activeSetupDay, idx, 'endTime', val)}
                          />
                        </div>

                        {setupSchedule[activeSetupDay].length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeClass(activeSetupDay, idx)}
                            className="p-2 rounded-xl border border-rose-500/25 text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center w-10 h-10 shrink-0 mb-[1px]"
                            aria-label="Remove slot"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center">
                <p className={`text-xs ${muted}`}>Add as many slots as you need for {activeSetupDay}.</p>
                <button
                  type="button"
                  onClick={() => addClass(activeSetupDay)}
                  className={`flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold border border-dashed transition-all ${dark ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-900' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                >
                  <Plus size={14} />
                  <span>Add Slot</span>
                </button>
              </div>
            </div>

            {/* Fixed Bottom Save Bar */}
            <div className={`fixed bottom-0 left-0 md:left-64 right-0 z-40 border-t ${border} ${dark ? 'bg-black/90' : 'bg-white/90'} backdrop-blur-md p-3.5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]`}>
              <div className="max-w-[700px] w-full mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className={`text-xs font-semibold ${muted} hidden sm:inline`}>
                  {hasUnsavedChanges ? "⚠️ You have unsaved changes in your schedule" : "✓ Schedule is up to date"}
                </span>

                <button
                  type="submit"
                  disabled={submitting || !hasUnsavedChanges}
                  className={`w-full sm:w-auto px-12 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md ${dark
                    ? 'bg-white text-black hover:opacity-90 disabled:bg-zinc-800 disabled:text-zinc-500'
                    : 'bg-black text-white hover:opacity-85 disabled:bg-zinc-100 disabled:text-zinc-400'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {submitting ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-350 animate-in fade-in duration-250">
          <div className={`rounded-2xl border p-6 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${dark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-250 text-zinc-900'
            }`}>
            <div className="mb-4">
              <h3 className="text-[16px] font-bold tracking-tight text-rose-500">Remove Class from Calendar?</h3>
              <p className={`mt-2.5 text-sm leading-relaxed ${muted}`}>
                Are you sure you want to remove <span className="font-semibold text-current">{deleteConfirm.subjectName}</span> from <span className="font-semibold text-current capitalize">{deleteConfirm.day}</span>? This will modify your weekly recurring schedule.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-900">
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
                style={{ backgroundColor: '#e11d48' }} // Rose-600
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

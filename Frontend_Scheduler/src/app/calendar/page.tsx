"use client";

import React, { useEffect, useState } from "react";
import API from "@/lib/axios";
import { useAuth } from "@/context/authContext";
import { useAttendance } from "@/context/AttendanceContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Calendar, Clock, Plus, Trash2 } from "lucide-react";

const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const daysOfWeek = weekdays;
const hours = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12
const minutes = ['00', '15', '30', '45'];
const meridiems = ['AM', 'PM'];

function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export default function CalendarPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth() as any;
  const { calendarData, setCalendarData, fetchCalendarData, fetchSummary } = useAttendance() as any;
  const { darkMode } = useDarkMode() as any;
  
  const [activeTab, setActiveTab] = useState<'view' | 'setup'>('view');
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ subjectId: string; subjectName: string; day: string } | null>(null);

  // Setup schedule state
  const [setupSchedule, setSetupSchedule] = useState<any>(
    weekdays.reduce((acc: any, day) => {
      acc[day] = [{
        subject: '',
        startHour: '9',
        startMinute: '00',
        startMeridiem: 'AM',
        endHour: '10',
        endMinute: '00',
        endMeridiem: 'AM'
      }];
      return acc;
    }, {})
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

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
          startHour: '9',
          startMinute: '00',
          startMeridiem: 'AM',
          endHour: '10',
          endMinute: '00',
          endMeridiem: 'AM',
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
        .filter((cls: any) => cls.subject.trim() !== '')
        .map((cls: any) => ({
          subjectName: cls.subject.trim(),
          time: `${cls.startHour.toString().padStart(2, '0')}:${cls.startMinute} ${cls.startMeridiem} - ${cls.endHour.toString().padStart(2, '0')}:${cls.endMinute} ${cls.endMeridiem}`
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

  const inputClass = `w-full px-3.5 py-2 text-sm rounded-lg border outline-none transition-colors
    ${dark
      ? 'bg-black border-gray-800 text-white placeholder-gray-700 focus:border-gray-600'
      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'
    }`;

  const selectClass = `px-2 py-2 text-sm rounded-lg border outline-none transition-colors cursor-pointer
    ${dark
      ? 'bg-black border-gray-800 text-white focus:border-gray-600'
      : 'bg-white border-gray-200 text-gray-900 focus:border-gray-400'
    }`;

  if (authLoading || (activeTab === 'view' && !calendarData)) {
    return (
      <div className={`min-h-screen flex justify-center items-center transition-colors duration-300 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
        <span className="inline-block w-6 h-6 rounded-full border-[2px] border-current border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 pt-[96px] md:pt-[24px] pb-32 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      <div className={`max-w-[${activeTab === 'view' ? '1100px' : '750px'}] w-full mx-auto px-5 transition-all duration-300`}>
        
        {/* Page Header with Tabs */}
        <div className={`sticky top-[76px] md:top-0 z-30 mb-8 border-b pb-4 pt-2 border-gray-100 dark:border-gray-900 -mx-5 px-5 ${dark ? 'bg-black/90' : 'bg-white/90'} backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
          <div>
            <p className={`text-[11px] uppercase tracking-widest ${muted} mb-1 flex items-center gap-1.5`}>
              <Calendar size={12} />
              <span>Time planner</span>
            </p>
            <h1 className="text-[22px] font-medium tracking-tight">Study Calendar</h1>
            <p className={`text-[13px] ${muted} mt-0.5`}>
              {activeTab === 'view' 
                ? 'Overview of your weekly classes. Click any card to remove it.' 
                : 'Configure classes for each day of the week to automatically track daily attendance metrics.'}
            </p>
          </div>
          
          <div className={`flex p-1 rounded-xl border ${border} ${dark ? 'bg-gray-900/50' : 'bg-gray-50/50'} self-start sm:self-auto`}>
            <button
              onClick={() => setActiveTab('view')}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === 'view'
                  ? (dark ? 'bg-gray-800 text-white shadow-sm' : 'bg-white text-black shadow-sm border border-gray-200/50')
                  : (dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-900')
              }`}
            >
              View Calendar
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === 'setup'
                  ? (dark ? 'bg-gray-800 text-white shadow-sm' : 'bg-white text-black shadow-sm border border-gray-200/50')
                  : (dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-900')
              }`}
            >
              Add Classes
            </button>
          </div>
        </div>

        {activeTab === 'view' ? (
          /* Calendar Weekly Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {daysOfWeek.map((day) => {
              const subjects = calendarData?.[day] || [];
              
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
        ) : (
          /* Setup Schedule Form */
          <form onSubmit={handleSetupSubmit} className="space-y-6 animate-in fade-in duration-300">
            {weekdays.map((day) => (
              <div key={day} className={`${cardClass} mb-6`}>
                <h3 className="capitalize font-medium text-[14.5px] tracking-tight mb-4 flex justify-between items-center border-b pb-2.5 border-gray-50 dark:border-gray-900">
                  <span>{day}</span>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${border} ${muted}`}>
                    {setupSchedule[day].length} {setupSchedule[day].length === 1 ? 'class' : 'slots'}
                  </span>
                </h3>

                <div className="space-y-4">
                  {setupSchedule[day].map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3">
                      
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Subject name"
                          value={item.subject}
                          onChange={(e) => handleSetupChange(day, idx, 'subject', e.target.value)}
                          className={inputClass}
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] uppercase tracking-wider min-w-[34px] ${muted}`}>Start:</span>
                        <select
                          value={item.startHour}
                          onChange={(e) => handleSetupChange(day, idx, 'startHour', e.target.value)}
                          className={selectClass}
                        >
                          {hours.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <select
                          value={item.startMinute}
                          onChange={(e) => handleSetupChange(day, idx, 'startMinute', e.target.value)}
                          className={selectClass}
                        >
                          {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select
                          value={item.startMeridiem}
                          onChange={(e) => handleSetupChange(day, idx, 'startMeridiem', e.target.value)}
                          className={selectClass}
                        >
                          {meridiems.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] uppercase tracking-wider min-w-[30px] ${muted}`}>End:</span>
                        <select
                          value={item.endHour}
                          onChange={(e) => handleSetupChange(day, idx, 'endHour', e.target.value)}
                          className={selectClass}
                        >
                          {hours.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <select
                          value={item.endMinute}
                          onChange={(e) => handleSetupChange(day, idx, 'endMinute', e.target.value)}
                          className={selectClass}
                        >
                          {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select
                          value={item.endMeridiem}
                          onChange={(e) => handleSetupChange(day, idx, 'endMeridiem', e.target.value)}
                          className={selectClass}
                        >
                          {meridiems.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>

                      {setupSchedule[day].length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeClass(day, idx)}
                          className="p-2 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors self-end sm:self-auto flex items-center justify-center"
                          aria-label="Remove slot"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-900 flex justify-end">
                  <button
                    type="button"
                    onClick={() => addClass(day)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-dashed transition-colors ${
                      dark ? 'border-gray-800 text-gray-300 hover:bg-gray-950' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Plus size={13} />
                    <span>Add Class</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Fixed Bottom Save Bar */}
            <div className={`fixed bottom-0 left-0 md:left-64 right-0 z-40 border-t ${border} ${dark ? 'bg-black/90' : 'bg-white/90'} backdrop-blur-md p-2.5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]`}>
              <div className="max-w-[750px] w-full mx-auto flex justify-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full sm:w-auto px-12 py-2.5 rounded-xl text-[14.5px] font-semibold transition-all hover:opacity-85 active:scale-95 shadow-md ${dark ? 'bg-white text-black' : 'bg-black text-white'} disabled:opacity-40`}
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

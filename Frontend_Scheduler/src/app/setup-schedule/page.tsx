"use client";

import { useState, useEffect } from 'react';
import API from '@/lib/axios';
import { useDarkMode } from '@/context/DarkModeContext';
import { useAuth } from '@/context/authContext';
import { useAttendance } from '@/context/AttendanceContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Clock, Plus, Trash2, Calendar } from 'lucide-react';

const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const hours = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12
const minutes = ['00', '15', '30', '45'];
const meridiems = ['AM', 'PM'];

export default function WeeklyScheduleSetup() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth() as any;
  const { darkMode } = useDarkMode() as any;
  const { fetchCalendarData, fetchSummary } = useAttendance() as any;
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  const [schedule, setSchedule] = useState<any>(
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

  const handleChange = (day: string, index: number, field: string, value: string) => {
    const updated = [...schedule[day]];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setSchedule({ ...schedule, [day]: updated });
  };

  const addClass = (day: string) => {
    setSchedule({
      ...schedule,
      [day]: [
        ...schedule[day],
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
    const updated = [...schedule[day]];
    updated.splice(index, 1);
    setSchedule({ ...schedule, [day]: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const formattedSchedule: any = {};
    for (const day of weekdays) {
      const validClasses = schedule[day]
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
      router.push('/dashboard');
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
  const cardClass = `border rounded-xl p-5 mb-6 ${border} ${dark ? 'bg-black' : 'bg-white'}`;

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

  const primaryBtn = `px-5 py-2.5 rounded-lg text-[13.5px] font-medium transition-opacity hover:opacity-80 active:scale-95
    ${dark ? 'bg-white text-black' : 'bg-black text-white'}
    disabled:opacity-40 w-full`;

  const secondaryBtn = `px-3.5 py-1.5 rounded-lg text-[13px] font-medium border transition-colors
    ${dark
      ? 'border-gray-800 text-gray-200 hover:bg-gray-900'
      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
    } disabled:opacity-40`;

  if (authLoading) {
    return (
      <div className={`min-h-screen flex justify-center items-center transition-colors duration-300 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
        <span className="inline-block w-6 h-6 rounded-full border-[2px] border-current border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 pt-[96px] pb-20 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      <div className="max-w-[750px] w-full mx-auto px-5">
        
        {/* Page Header */}
        <div className="mb-8 border-b pb-5 border-gray-100 dark:border-gray-900">
          <p className={`text-[11px] uppercase tracking-widest ${muted} mb-1 flex items-center gap-1.5`}>
            <Clock size={12} />
            <span>Schedule Builder</span>
          </p>
          <h1 className="text-[22px] font-medium tracking-tight">Set Schedule</h1>
          <p className={`text-[13px] ${muted} mt-0.5`}>Configure classes for each day of the week to automatically track daily attendance metrics.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {weekdays.map((day) => (
            <div key={day} className={cardClass}>
              {/* Day title */}
              <h3 className="capitalize font-medium text-[14.5px] tracking-tight mb-4 flex justify-between items-center border-b pb-2.5 border-gray-50 dark:border-gray-900">
                <span>{day}</span>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${border} ${muted}`}>
                  {schedule[day].length} {schedule[day].length === 1 ? 'class' : 'slots'}
                </span>
              </h3>

              {/* Day's classes list */}
              <div className="space-y-4">
                {schedule[day].map((item: any, idx: number) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3">
                    
                    {/* Subject input */}
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Subject name"
                        value={item.subject}
                        onChange={(e) => handleChange(day, idx, 'subject', e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    {/* Start Time Selectors */}
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] uppercase tracking-wider min-w-[34px] ${muted}`}>Start:</span>
                      <select
                        value={item.startHour}
                        onChange={(e) => handleChange(day, idx, 'startHour', e.target.value)}
                        className={selectClass}
                      >
                        {hours.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <select
                        value={item.startMinute}
                        onChange={(e) => handleChange(day, idx, 'startMinute', e.target.value)}
                        className={selectClass}
                      >
                        {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select
                        value={item.startMeridiem}
                        onChange={(e) => handleChange(day, idx, 'startMeridiem', e.target.value)}
                        className={selectClass}
                      >
                        {meridiems.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    {/* End Time Selectors */}
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] uppercase tracking-wider min-w-[30px] ${muted}`}>End:</span>
                      <select
                        value={item.endHour}
                        onChange={(e) => handleChange(day, idx, 'endHour', e.target.value)}
                        className={selectClass}
                      >
                        {hours.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <select
                        value={item.endMinute}
                        onChange={(e) => handleChange(day, idx, 'endMinute', e.target.value)}
                        className={selectClass}
                      >
                        {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select
                        value={item.endMeridiem}
                        onChange={(e) => handleChange(day, idx, 'endMeridiem', e.target.value)}
                        className={selectClass}
                      >
                        {meridiems.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    {/* Remove button */}
                    {schedule[day].length > 1 && (
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

              {/* Add slot controls */}
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

          {/* Form Submit Footer */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className={primaryBtn}
            >
              {submitting ? 'Saving schedule...' : 'Save Weekly Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

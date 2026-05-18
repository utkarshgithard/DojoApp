"use client";

import React, { useState } from 'react';
import API from '@/lib/axios';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Users, BookOpen } from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';
import { TimePicker } from '@/components/ui/time-picker';

const CreateStudySession = ({ socket, onClose }: { socket: any, onClose: () => void }) => {
    const { darkMode } = useDarkMode() as any;
    const [subject, setSubject] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('09:00');
    const [duration, setDuration] = useState(30);
    const [invitedFriends, setInvitedFriends] = useState('');
    const [loading, setLoading] = useState(false);
    const [calendarOpen, setCalendarOpen] = useState(false);

    const handleCreateSession = async () => {
        if (!subject || !date || !time || !invitedFriends) {
            return toast.error('Please fill in all fields');
        }
        setLoading(true);
        try {
            const response = await API.post('/study-session', {
                subject,
                date,
                time,
                duration,
                invitedFriends: invitedFriends.split(',').map(f => f.trim())
            });

            // Clear form
            setSubject('');
            setDate('');
            setTime('');
            setDuration(30);
            setInvitedFriends('');

            if (onClose) onClose();
            toast.success('Study session created and invites sent!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to create study session.');
        } finally {
            setLoading(false);
        }
    };

    const dark = darkMode;
    const border = dark ? 'border-gray-800' : 'border-gray-200';
    const muted = dark ? 'text-gray-400' : 'text-gray-500';

    const inputClass = `w-full px-3.5 py-2 text-sm rounded-lg border outline-none transition-colors mb-3
        ${dark
          ? 'bg-black border-gray-800 text-white placeholder-gray-700 focus:border-gray-600'
          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'
        }`;

    const labelClass = `block text-[11px] uppercase tracking-wider font-medium mb-1.5 ${muted}`;

    return (
        <div className="space-y-4">
            
            {/* Subject field */}
            <div>
                <label className={labelClass}>Subject Name</label>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="e.g. Physics II, Algorithms"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        className={inputClass}
                    />
                </div>
            </div>

            {/* Date field */}
            <div>
                <label className={labelClass}>Date</label>
                <div className="relative mb-3">
                    <button
                        type="button"
                        onClick={() => setCalendarOpen(!calendarOpen)}
                        className={`flex items-center space-x-2 w-full px-3.5 py-2 border rounded-lg text-sm transition-colors text-left ${
                            dark 
                                ? 'border-gray-800 bg-black text-gray-200 hover:bg-gray-950' 
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <CalendarIcon className="size-4 text-gray-400" />
                        <span className="truncate">
                            {date ? format(new Date(date + 'T00:00:00'), 'PPP') : 'Select Date'}
                        </span>
                    </button>
                    
                    {calendarOpen && (
                        <div className={`absolute left-0 mt-1.5 z-[60] p-2 rounded-lg border shadow-xl ${
                            dark ? 'bg-black border-gray-800' : 'bg-white border-gray-200'
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

            {/* Grid for Time & Duration */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Start Time</label>
                    <TimePicker
                        value={time}
                        onChange={setTime}
                    />
                </div>
                <div>
                    <label className={labelClass}>Duration (mins)</label>
                    <input
                        type="number"
                        placeholder="Minutes"
                        value={duration}
                        onChange={e => setDuration(Number(e.target.value))}
                        className={inputClass}
                    />
                </div>
            </div>

            {/* Invite Friends */}
            <div>
                <label className={labelClass}>Invite Friends</label>
                <input
                    type="text"
                    placeholder="Friend codes (comma separated)"
                    value={invitedFriends}
                    onChange={e => setInvitedFriends(e.target.value)}
                    className={inputClass}
                />
                <p className={`text-[10.5px] -mt-1.5 mb-4 ${muted}`}>Enter 6-digit codes separated by commas (e.g. ABCDEF, XYZ123)</p>
            </div>

            {/* Actions */}
            <div className="pt-2">
                <button
                    onClick={handleCreateSession}
                    disabled={loading}
                    className={`w-full py-2.5 rounded-lg text-[13px] font-medium transition-opacity hover:opacity-80 active:scale-95
                        ${dark ? 'bg-white text-black' : 'bg-black text-white'}
                        disabled:opacity-40`}
                >
                    {loading ? 'Creating session...' : 'Create Study Session'}
                </button>
            </div>
        </div>
    );
};

export default CreateStudySession;

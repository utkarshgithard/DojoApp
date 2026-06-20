"use client";

import React, { useState, useEffect, useRef } from 'react';
import API from '@/lib/axios';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, ChevronDown, X, Search, UserPlus } from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';
import { useNetwork } from '@/context/NetworkContext';

interface Friend {
  id: string;
  name: string;
  friendCode: string;
}

// ---------------------------------------------------------------------------
// Multi-select friend dropdown
// ---------------------------------------------------------------------------
function FriendMultiSelect({
  friends,
  friendsLoading,
  selected,
  onToggle,
  dark,
  border,
  muted,
}: {
  friends: Friend[];
  friendsLoading: boolean;
  selected: Friend[];
  onToggle: (friend: Friend) => void;
  dark: boolean;
  border: string;
  muted: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = friends.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  const isSelected = (f: Friend) => selected.some((s) => s.id === f.id);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm rounded-lg border outline-none transition-colors text-left
          ${dark
            ? 'bg-black border-gray-800 text-gray-200 hover:border-gray-600'
            : 'bg-white border-gray-200 text-gray-800 hover:border-gray-400'
          }`}
      >
        <span className={selected.length === 0 ? (dark ? 'text-gray-600' : 'text-gray-400') : ''}>
          {selected.length === 0
            ? 'Select friends to invite…'
            : `${selected.length} friend${selected.length > 1 ? 's' : ''} selected`}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${muted}`}
        />
      </button>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((f) => (
            <span
              key={f.id}
              className={`inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-[11.5px] font-medium border
                ${dark
                  ? 'bg-gray-900 border-gray-700 text-gray-200'
                  : 'bg-gray-100 border-gray-200 text-gray-700'
                }`}
            >
              {/* Avatar initial */}
              <span className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] font-bold
                ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-700'}`}>
                {f.name.charAt(0).toUpperCase()}
              </span>
              {f.name}
              <button
                type="button"
                onClick={() => onToggle(f)}
                className={`ml-0.5 rounded-full p-0.5 transition-colors ${dark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                aria-label={`Remove ${f.name}`}
              >
                <X size={9} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown panel */}
      {open && (
        <div
          className={`absolute left-0 right-0 mt-1.5 z-[60] rounded-xl border shadow-2xl overflow-hidden
            ${dark ? 'bg-zinc-950 border-gray-800' : 'bg-white border-gray-200'}`}
        >
          {/* Search */}
          <div className={`flex items-center gap-2 px-3 py-2 border-b ${border}`}>
            <Search size={12} className={muted} />
            <input
              autoFocus
              type="text"
              placeholder="Search friends…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`flex-1 text-[12.5px] bg-transparent outline-none ${dark ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
            />
          </div>

          {/* Friend list */}
          <div className="max-h-48 overflow-y-auto py-1">
            {friendsLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${dark ? 'border-gray-600' : 'border-gray-300'}`} />
              </div>
            ) : filtered.length === 0 ? (
              <div className={`flex flex-col items-center gap-1.5 py-5 text-center ${muted}`}>
                <UserPlus size={16} className="opacity-50" />
                <p className="text-[12px]">
                  {query ? 'No friends match your search' : 'No friends added yet'}
                </p>
              </div>
            ) : (
              filtered.map((f) => {
                const selected_ = isSelected(f);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onToggle(f)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors
                      ${selected_
                        ? dark ? 'bg-gray-900' : 'bg-gray-50'
                        : dark ? 'hover:bg-gray-900/60' : 'hover:bg-gray-50'
                      }`}
                  >
                    {/* Avatar */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0
                      ${selected_
                        ? dark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                        : dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                      {f.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Name */}
                    <span className={`flex-1 text-[13px] font-medium truncate ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                      {f.name}
                    </span>

                    {/* Checkmark */}
                    {selected_ && (
                      <svg className={`w-4 h-4 shrink-0 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`} viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const CreateStudySession = ({ socket, onClose }: { socket: any; onClose: () => void }) => {
  const { darkMode } = useDarkMode() as any;
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [duration, setDuration] = useState(30);
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const { network, fetchNetwork, hasData, loading: networkLoading } = useNetwork();
  const friends = (network.friends as any[]) || [];
  const friendsLoading = networkLoading && !hasData;

  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (!hasData) {
      fetchNetwork();
    }
  }, [hasData, fetchNetwork]);

  const toggleFriend = (friend: Friend) => {
    setSelectedFriends((prev) =>
      prev.some((f) => f.id === friend.id)
        ? prev.filter((f) => f.id !== friend.id)
        : [...prev, friend]
    );
  };

  const handleCreateSession = async () => {
    if (!subject || !date) {
      return toast.error('Please fill in all required fields');
    }
    setLoading(true);

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
      await API.post('/study-session', {
        subject,
        date,
        time: currentTime,
        duration,
        // Map selected friends → their friend codes for the existing API contract
        invitedFriends: selectedFriends.map((f) => f.friendCode),
      });

      setSubject('');
      const today = new Date();
      setDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
      setDuration(30);
      setSelectedFriends([]);

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
        <input
          type="text"
          placeholder="e.g. Physics II, Algorithms"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Invite Friends — multi-select dropdown */}
      <div>
        <label className={labelClass}>Invite Friends <span className={`normal-case tracking-normal font-normal ${muted}`}>(optional)</span></label>
        <FriendMultiSelect
          friends={friends}
          friendsLoading={friendsLoading}
          selected={selectedFriends}
          onToggle={toggleFriend}
          dark={dark}
          border={border}
          muted={muted}
        />
      </div>

      {/* Date field */}
      <div>
        <label className={labelClass}>Date</label>
        <div className="relative mb-3">
          <button
            type="button"
            onClick={() => setCalendarOpen(!calendarOpen)}
            className={`flex items-center space-x-2 w-full px-3.5 py-2 border rounded-lg text-sm transition-colors text-left ${dark
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
            <div className={`absolute left-0 bottom-full mb-1.5 z-[60] p-2 rounded-lg border shadow-xl origin-bottom-left scale-[0.82] ${dark ? 'bg-black border-gray-800' : 'bg-white border-gray-200'}`}>
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

      {/* Duration field */}
      <div>
        <label className={labelClass}>Duration (mins)</label>
        <input
          type="number"
          placeholder="Minutes"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className={inputClass}
        />
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
          {loading ? 'Creating session…' : 'Create Study Session'}
        </button>
      </div>
    </div>
  );
};

export default CreateStudySession;

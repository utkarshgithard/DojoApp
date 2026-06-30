"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';

interface TimePickerProps {
  value: string; // 24-hour format: "HH:MM"
  onChange: (value: string) => void;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const periods = ["AM", "PM"];

export function TimePicker({ value, onChange, disabled = false, onOpenChange }: TimePickerProps) {
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to change open state and notify parent
  const changeOpenState = (open: boolean) => {
    setIsOpen(open);
    if (onOpenChange) {
      onOpenChange(open);
    }
  };

  // Internal states (strings)
  const [selectedHour, setSelectedHour] = useState("");
  const [selectedMinute, setSelectedMinute] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");

  // Refs for auto-scrolling columns
  const hourColRef = useRef<HTMLDivElement>(null);
  const minuteColRef = useRef<HTMLDivElement>(null);
  const periodColRef = useRef<HTMLDivElement>(null);

  // Sync internal state with incoming value
  useEffect(() => {
    if (!value) {
      setSelectedHour("");
      setSelectedMinute("");
      setSelectedPeriod("");
      return;
    }

    const parts = value.split(':');
    if (parts.length !== 2) return;

    const h24 = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);

    if (isNaN(h24) || isNaN(m)) return;

    let p = "AM";
    let h12 = h24;

    if (h24 >= 12) {
      p = "PM";
      h12 = h24 === 12 ? 12 : h24 - 12;
    } else {
      p = "AM";
      h12 = h24 === 0 ? 12 : h24;
    }

    setSelectedHour(String(h12).padStart(2, '0'));
    setSelectedMinute(String(m).padStart(2, '0'));
    setSelectedPeriod(p);
  }, [value]);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        changeOpenState(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Center active element in its scroll column
  const scrollActiveIntoView = (colRef: React.RefObject<HTMLDivElement>, activeIndex: number) => {
    if (colRef.current) {
      const activeEl = colRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        colRef.current.scrollTo({
          top: activeEl.offsetTop - colRef.current.clientHeight / 2 + activeEl.clientHeight / 2,
          behavior: 'smooth'
        });
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (selectedHour) {
          const hIdx = hours.indexOf(selectedHour);
          scrollActiveIntoView(hourColRef, hIdx);
        }
        if (selectedMinute) {
          const mIdx = minutes.indexOf(selectedMinute);
          scrollActiveIntoView(minuteColRef, mIdx);
        }
        if (selectedPeriod) {
          const pIdx = periods.indexOf(selectedPeriod);
          scrollActiveIntoView(periodColRef, pIdx);
        }
      }, 50);
    }
  }, [isOpen, selectedHour, selectedMinute, selectedPeriod]);

  // Handle selection updates
  const handleSelect = (type: 'hour' | 'minute' | 'period', val: string) => {
    let h = selectedHour;
    let m = selectedMinute;
    let p = selectedPeriod;

    if (type === 'hour') {
      h = val;
      setSelectedHour(val);
    } else if (type === 'minute') {
      m = val;
      setSelectedMinute(val);
    } else if (type === 'period') {
      p = val;
      setSelectedPeriod(val);
      changeOpenState(false); // Auto-close when AM/PM is selected
    }

    // If we have a complete selection, propagate to parent
    if (h && m && p) {
      let h12 = parseInt(h, 10);
      let h24 = h12;
      if (p === "PM") {
        h24 = h12 === 12 ? 12 : h12 + 12;
      } else {
        h24 = h12 === 12 ? 0 : h12;
      }
      onChange(`${String(h24).padStart(2, '0')}:${m}`);
    }
  };

  // Format display text e.g. "09:30 AM"
  const getDisplayText = () => {
    if (!selectedHour || !selectedMinute || !selectedPeriod) {
      return "Select time...";
    }
    return `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
  };

  const borderClass = dark ? 'border-zinc-800' : 'border-zinc-200';
  const bgClass = dark ? 'bg-zinc-955 text-white' : 'bg-white text-zinc-900';

  return (
    <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-30' : 'z-10'}`}>
      
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => changeOpenState(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2 text-sm rounded-xl border ${borderClass} ${bgClass} hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all duration-200 ${
          disabled ? 'opacity-40 pointer-events-none' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-zinc-400 shrink-0" />
          <span className={!selectedHour ? 'text-zinc-400 dark:text-zinc-500' : 'font-medium'}>
            {getDisplayText()}
          </span>
        </div>
        <ChevronDown className="size-4 text-zinc-400 shrink-0" />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div 
          className={`absolute left-0 mt-1.5 z-50 p-3 rounded-2xl border ${borderClass} ${
            dark ? 'bg-zinc-950 border-white/[0.08]' : 'bg-white border-zinc-200/60'
          } backdrop-blur-xl shadow-2xl flex gap-3.5 animate-in fade-in slide-in-from-top-2 duration-200`}
          style={{ width: '220px' }}
        >
          {/* Hours Column */}
          <div className="flex flex-col items-center flex-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Hrs</span>
            <div 
              ref={hourColRef}
              className="h-36 overflow-y-auto w-full flex flex-col gap-0.5 no-scrollbar scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleSelect('hour', h)}
                  className={`w-full py-1 text-xs font-semibold rounded-lg transition-all ${
                    selectedHour === h
                      ? 'bg-indigo-650 text-white'
                      : dark 
                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900' 
                        : 'text-zinc-650 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="w-[1px] h-36 bg-zinc-105 dark:bg-zinc-900 self-end mb-1" />

          {/* Minutes Column */}
          <div className="flex flex-col items-center flex-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Min</span>
            <div 
              ref={minuteColRef}
              className="h-36 overflow-y-auto w-full flex flex-col gap-0.5 no-scrollbar scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {minutes.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelect('minute', m)}
                  className={`w-full py-1 text-xs font-semibold rounded-lg transition-all ${
                    selectedMinute === m
                      ? 'bg-indigo-650 text-white'
                      : dark 
                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900' 
                        : 'text-zinc-650 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="w-[1px] h-36 bg-zinc-105 dark:bg-zinc-900 self-end mb-1" />

          {/* Period Column (AM/PM) */}
          <div className="flex flex-col items-center flex-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">AM/PM</span>
            <div 
              ref={periodColRef}
              className="h-36 overflow-y-auto w-full flex flex-col gap-0.5 no-scrollbar scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {periods.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSelect('period', p)}
                  className={`w-full py-2.5 text-xs font-bold rounded-lg transition-all ${
                    selectedPeriod === p
                      ? 'bg-indigo-650 text-white'
                      : dark 
                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900' 
                        : 'text-zinc-650 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

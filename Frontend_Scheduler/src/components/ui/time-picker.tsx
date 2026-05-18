"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';

interface TimePickerProps {
  value: string; // 24-hour format: "HH:MM"
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, disabled = false }: TimePickerProps) {
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;

  // Internal states
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);

  // Sync internal state with external value
  useEffect(() => {
    if (!value) {
      setHour("09");
      setMinute("00");
      setPeriod("AM");
      return;
    }

    const parts = value.split(':');
    if (parts.length !== 2) return;

    const h24 = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);

    if (isNaN(h24) || isNaN(m)) return;

    let p: "AM" | "PM" = "AM";
    let h12 = h24;

    if (h24 >= 12) {
      p = "PM";
      h12 = h24 === 12 ? 12 : h24 - 12;
    } else {
      p = "AM";
      h12 = h24 === 0 ? 12 : h24;
    }

    setHour(String(h12).padStart(2, '0'));
    setMinute(String(m).padStart(2, '0'));
    setPeriod(p);
  }, [value]);

  // Propagate changes to parent
  const updateParent = (h: string, m: string, p: "AM" | "PM") => {
    let h12 = parseInt(h, 10);
    if (isNaN(h12)) h12 = 9;

    let mNum = parseInt(m, 10);
    if (isNaN(mNum)) mNum = 0;

    let h24 = h12;
    if (p === "PM") {
      h24 = h12 === 12 ? 12 : h12 + 12;
    } else {
      h24 = h12 === 12 ? 0 : h12;
    }

    const newValue = `${String(h24).padStart(2, '0')}:${String(mNum).padStart(2, '0')}`;
    onChange(newValue);
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(-2);
    setHour(val);

    if (val.length === 2) {
      let num = parseInt(val, 10);
      if (num < 1) num = 1;
      if (num > 12) num = 12;
      const formatted = String(num).padStart(2, '0');
      setHour(formatted);
      updateParent(formatted, minute, period);
      // Auto focus minute
      minuteRef.current?.focus();
    } else {
      updateParent(val, minute, period);
    }
  };

  const handleHourBlur = () => {
    let num = parseInt(hour, 10);
    if (isNaN(num) || num < 1) num = 9;
    if (num > 12) num = 12;
    const formatted = String(num).padStart(2, '0');
    setHour(formatted);
    updateParent(formatted, minute, period);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(-2);
    setMinute(val);

    if (val.length === 2) {
      let num = parseInt(val, 10);
      if (num < 0) num = 0;
      if (num > 59) num = 59;
      const formatted = String(num).padStart(2, '0');
      setMinute(formatted);
      updateParent(hour, formatted, period);
    } else {
      updateParent(hour, val, period);
    }
  };

  const handleMinuteBlur = () => {
    let num = parseInt(minute, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 59) num = 59;
    const formatted = String(num).padStart(2, '0');
    setMinute(formatted);
    updateParent(hour, formatted, period);
  };

  const togglePeriod = () => {
    if (disabled) return;
    const nextPeriod = period === "AM" ? "PM" : "AM";
    setPeriod(nextPeriod);
    updateParent(hour, minute, nextPeriod);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, isHour: boolean) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isHour) {
        let num = parseInt(hour, 10) + 1;
        if (num > 12) num = 1;
        const formatted = String(num).padStart(2, '0');
        setHour(formatted);
        updateParent(formatted, minute, period);
      } else {
        let num = parseInt(minute, 10) + 5;
        if (num > 59) num = 0;
        const formatted = String(num).padStart(2, '0');
        setMinute(formatted);
        updateParent(hour, formatted, period);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (isHour) {
        let num = parseInt(hour, 10) - 1;
        if (num < 1) num = 12;
        const formatted = String(num).padStart(2, '0');
        setHour(formatted);
        updateParent(formatted, minute, period);
      } else {
        let num = parseInt(minute, 10) - 5;
        if (num < 0) num = 55;
        const formatted = String(num).padStart(2, '0');
        setMinute(formatted);
        updateParent(hour, formatted, period);
      }
    }
  };

  const borderClass = dark ? 'border-gray-800 focus-within:border-gray-600' : 'border-gray-200 focus-within:border-gray-400';
  const textClass = dark ? 'text-white' : 'text-gray-900';

  return (
    <div 
      className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 transition-colors ${borderClass} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
    >
      <Clock className="size-4 text-gray-400 shrink-0" />
      
      <div className="flex items-center gap-0.5">
        <input
          ref={hourRef}
          type="text"
          value={hour}
          onChange={handleHourChange}
          onBlur={handleHourBlur}
          onKeyDown={(e) => handleKeyDown(e, true)}
          placeholder="09"
          disabled={disabled}
          className="w-5 text-center border-none outline-none p-0 font-medium text-sm bg-transparent text-current"
        />
        
        <span className="text-gray-400 font-medium text-xs select-none">:</span>
        
        <input
          ref={minuteRef}
          type="text"
          value={minute}
          onChange={handleMinuteChange}
          onBlur={handleMinuteBlur}
          onKeyDown={(e) => handleKeyDown(e, false)}
          placeholder="00"
          disabled={disabled}
          className="w-5 text-center border-none outline-none p-0 font-medium text-sm bg-transparent text-current"
        />
      </div>

      <div className="w-[1px] h-3.5 bg-gray-200 dark:bg-gray-800 mx-1" />

      <button
        type="button"
        onClick={togglePeriod}
        disabled={disabled}
        className={`text-[10px] font-semibold border rounded px-1.5 py-0.5 uppercase transition-colors 
          ${dark 
            ? 'border-gray-800 text-gray-300 hover:bg-gray-900 active:bg-gray-950' 
            : 'border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100'
          }`}
      >
        {period}
      </button>
    </div>
  );
}

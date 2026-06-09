import React, { useEffect, useState } from 'react';

interface CallDurationTimerProps {
  startedAt: Date | null;
}

export function CallDurationTimer({ startedAt }: CallDurationTimerProps) {
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    if (!startedAt) {
      setElapsed('00:00');
      return;
    }

    const updateTimer = () => {
      const diffMs = Date.now() - new Date(startedAt).getTime();
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
      const m = Math.floor(diffSecs / 60);
      const s = diffSecs % 60;
      const pad = (num: number) => String(num).padStart(2, '0');
      setElapsed(`${pad(m)}:${pad(s)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span className="font-mono text-[12.5px] font-bold px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/5 select-none">
      {elapsed}
    </span>
  );
}
export function getCallDurationString(startedAt: Date | null): string {
  if (!startedAt) return '00:00';
  const diffMs = Date.now() - new Date(startedAt).getTime();
  const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
  const m = Math.floor(diffSecs / 60);
  const s = diffSecs % 60;
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${pad(m)}:${pad(s)}`;
}

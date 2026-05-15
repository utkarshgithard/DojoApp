"use client";
import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import API from '@/lib/axios';

interface HiddenLines {
  attended?: boolean;
  missed?: boolean;
  cancelled?: boolean;
  [key: string]: boolean | undefined;
}

export default function AttendanceGraph({ userId }: { userId?: string }) {
  const [data, setData] = useState([]);
  const [view, setView] = useState('daily');
  const [hiddenLines, setHiddenLines] = useState<HiddenLines>({});

  const graphDetail = useCallback(async () => {
    try {
      // Assuming the API expect query params like ?view=daily
      const res = await API.get(`/subject/stats/?view=${view}${userId ? `&userId=${userId}` : ''}`);
      console.log("----------Graph Info ----------");
      console.log(res);
      if (res.data) {
        setData(res.data);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  }, [view, userId]);

  useEffect(() => {
    graphDetail();
  }, [graphDetail]);

  const toggleLine = (lineKey: string) => {
    setHiddenLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }));
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-md">
      {/* View Switch */}
      <div className="mb-4 flex gap-2">
        {['daily', 'weekly', 'monthly'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 rounded-lg transition-colors ${
              view === v 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Graph */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ccc" vertical={false} />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend 
              onClick={(e) => toggleLine(e.dataKey as string)} 
              wrapperStyle={{ cursor: 'pointer', paddingTop: '10px' }}
            />
            {!hiddenLines.attended && (
              <Line type="monotone" dataKey="attended" stroke="#4cafef" strokeWidth={3} dot={false} animationDuration={500} />
            )}
            {!hiddenLines.missed && (
              <Line type="monotone" dataKey="missed" stroke="#f44336" strokeWidth={3} dot={false} animationDuration={500} />
            )}
            {!hiddenLines.cancelled && (
              <Line type="monotone" dataKey="cancelled" stroke="#ff9800" strokeWidth={3} dot={false} animationDuration={500} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}



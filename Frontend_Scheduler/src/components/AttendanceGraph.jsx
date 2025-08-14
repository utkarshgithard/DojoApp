import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import API from '../api/axios';

export default function AttendanceGraph({ userId }) {
  const [data, setData] = useState([]);
  const [view, setView] = useState('daily');
  const [hiddenLines, setHiddenLines] = useState({});
  const graphDetail = async()=>{
    try {
        const res = API.get(`/subject/stats/?${view}`)
        console.log("----------Graph Info ----------")
        console.log(res)
    } catch (error) {
        console.error("Error fetching subjects:", error);
    }
    }
  

  useEffect(() => {
    graphDetail();
  }, [view, userId]);

  const toggleLine = (lineKey) => {
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
            className={`px-3 py-1 rounded-lg ${view === v ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Graph */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend onClick={(e) => toggleLine(e.dataKey)} />
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
  );
}

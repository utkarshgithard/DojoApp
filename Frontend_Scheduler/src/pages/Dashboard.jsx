import { useEffect, useState } from 'react';
import API from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';

function Dashboard() {
  const { darkMode } = useDarkMode();

  const [subjectsToday, setSubjectsToday] = useState([]);
  const [dayName, setDayName] = useState('');
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState('');
  const [subjectSummary, setSubjectSummary] = useState({});

  useEffect(() => {
    const fetchTodaySchedule = async () => {
      try {
        const res = await API.get('/schedule/today');
        setSubjectsToday(res.data.subjects);
        setDayName(res.data.day);

        const today = new Date();
        const formatted = today.toISOString().split('T')[0];
        setDate(formatted);
      } catch (err) {
        console.error(err);
        setSubjectsToday([]);
      }
    };

    const fetchSummary = async () => {
      try {
        const res = await API.get('/attendance/summary');
        setSubjectSummary(res.data.summary);
      } catch (err) {
        console.error(err);
      }
    };

    fetchTodaySchedule();
    fetchSummary();
  }, []);

  const handleChange = (index, value) => {
    setAttendance((prev) => ({
      ...prev,
      [index]: value
    }));
  };

  const handleSave = async () => {
    const status = subjectsToday.map((item, index) => ({
      subject: item.subject,
      time: item.time,
      attendance: attendance[index] || 'attended'
    }));

    try {
      const res = await API.post('/attendance/mark', { date, status });
      alert(res.data.message);
    } catch (err) {
      console.error(err);
      alert('❌ Failed to save attendance.');
    }
  };

  return (
    <div className={`min-h-screen p-6 transition-colors duration-300 ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <h1 className="text-4xl font-bold text-left mb-8 tracking-tight ">
         Attendance Dashboard
      </h1>

      {/* Schedule Section */}
      <div className={`max-w-3xl mx-auto rounded-lg p-6 border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
        <h2 className="text-2xl font-semibold capitalize mb-6">
          Today’s Schedule ({dayName || '—'})
        </h2>

        {subjectsToday.length === 0 ? (
          <p className="text-gray-500 text-center text-lg">No classes today.</p>
        ) : (
          <div className="space-y-4">
            {subjectsToday.map((item, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
                }`}
              >
                <div>
                  <p className="font-medium text-lg">{item.subject}</p>
                  <p className="text-sm text-gray-500">{item.time}</p>
                </div>
                <div className="flex gap-4">
                  {['attended', 'missed', 'cancelled'].map((status) => (
                    <label key={status} className="text-sm flex items-center gap-2 capitalize cursor-pointer">
                      <input
                        type="radio"
                        name={`attendance-${index}`}
                        value={status}
                        checked={attendance[index] === status}
                        onChange={() => handleChange(index, status)}
                        className="w-4 h-4 text-black focus:ring-black dark:text-white dark:focus:ring-white"
                      />
                      <span>{status}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="text-center mt-6">
              <button
                onClick={handleSave}
                className="bg-black text-white dark:bg-white dark:text-black px-8 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-200"
              >
                ✅ Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Section */}
      <div className={`max-w-4xl mx-auto mt-8 rounded-lg p-6 border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
        <h2 className="text-2xl font-semibold mb-6">Attendance Summary</h2>

        {Object.keys(subjectSummary).length === 0 ? (
          <p className="text-gray-500 text-center text-lg">No attendance data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border text-center rounded-lg">
              <thead className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'}`}>
                <tr>
                  <th className="p-3 border">Subject</th>
                  <th className="p-3 border">Attended ✅</th>
                  <th className="p-3 border">Missed ❌</th>
                  <th className="p-3 border">Cancelled 🚫</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(subjectSummary).map(([subject, stats], index) => (
                  <tr
                    key={index}
                    className={`border-t ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                  >
                    <td className="p-3 border font-medium">{subject}</td>
                    <td className="p-3 border">{stats.attended}</td>
                    <td className="p-3 border">{stats.missed}</td>
                    <td className="p-3 border">{stats.cancelled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
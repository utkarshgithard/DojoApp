import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import moment from 'moment';
import Swal from 'sweetalert2';
import { useDarkMode } from '../context/DarkModeContext';

const Dashboard = () => {
  const { darkMode } = useDarkMode();

  const [unmarkedSubjects, setUnmarkedSubjects] = useState([]);
  const [markedSubjects, setMarkedSubjects] = useState([]);
  const [summary, setSummary] = useState({ attended: 0, missed: 0, cancelled: 0 });
  const [date, setDate] = useState(moment().format('YYYY-MM-DD'));

  const fetchSubjects = async (latestMarkedSubjects = []) => {
    try {
      const res = await API.get(`/subject?date=${date}`);
      const allSubjects = res.data.unmarkedSubjects || [];
      const filteredSubjects = allSubjects.filter(
        (subject) =>
          !latestMarkedSubjects.some(
            (marked) =>
              marked.subject.toLowerCase() === subject.subject.toLowerCase()
          )
      );
      setUnmarkedSubjects(filteredSubjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await API.get(`/attendance/summary?date=${date}`);
      const summaryArray = res.data.summary;
      setMarkedSubjects(summaryArray);
      await fetchSubjects(summaryArray);
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [date]);

  const handleAttendance = async (subject, status) => {
    try {
      const result = await Swal.fire({
        title: `Mark "${subject.subjectName || subject.subject}" as "${status}"?`,
        text: "This action cannot be undone.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
      });

      if (!result.isConfirmed) return;

      await API.post('/attendance/mark', {
        date,
        status: [{
          subject: subject.subjectName || subject.subject,
          status
        }]
      });

      setUnmarkedSubjects(prev => prev.filter(s => s._id !== subject._id));
      setMarkedSubjects(prev => [...prev, { ...subject, status }]);

      Swal.fire('Success', 'Attendance marked successfully.', 'success');
    } catch (error) {
      console.error("Error marking attendance:", error);
      Swal.fire('Error', 'Could not mark attendance.', 'error');
    }
  };

  return (
    <div className={`p-4 min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-black text-white' : 'bg-white text-black'} mt-14`}>
      <div className="text-2xl font-bold mb-6">Dashboard</div>

      {/* Date Picker */}
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mb-6 p-2 border rounded bg-transparent dark:bg-transparent border-black dark:border-white text-black dark:text-white"
      />

      {/* Unmarked Subjects */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Today’s Classes</h2>
        {unmarkedSubjects.length === 0 ? (
          <p>No classes scheduled for today.</p>
        ) : (
          <div className="space-y-4">
            {unmarkedSubjects.map(subject => (
              <div
                key={subject._id}
                className="border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 dark:border-white border-black"
              >
                <div>
                  <p className="font-semibold text-lg">{subject.subjectName || subject.subject}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{subject.time}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleAttendance(subject, 'attended')}
                    className="border border-black dark:border-white px-4 py-1 rounded hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
                  >
                    Attended
                  </button>
                  <button
                    onClick={() => handleAttendance(subject, 'missed')}
                    className="border border-black dark:border-white px-4 py-1 rounded hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
                  >
                    Missed
                  </button>
                  <button
                    onClick={() => handleAttendance(subject, 'cancelled')}
                    className="border border-black dark:border-white px-4 py-1 rounded hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
                  >
                    Cancelled
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Marked Subjects */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Marked Attendance</h2>
        {markedSubjects.length === 0 ? (
          <p>No attendance marked yet.</p>
        ) : (
          <div className="space-y-4">
            {markedSubjects.map(subject => (
              <div
                key={subject._id}
                className="border rounded-lg p-4 flex justify-between items-center dark:border-white border-black"
              >
                <div>
                  <p className="font-semibold text-lg">{subject.subject}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{subject.time}</p>
                </div>
                <span className={`px-4 py-1 rounded-full border text-sm uppercase ${
                  subject.status === 'attended' ? 'border-green-500 text-green-600' :
                  subject.status === 'missed' ? 'border-red-500 text-red-600' :
                  'border-gray-500 text-gray-600'
                }`}>
                  {subject.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Section */}
      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4">Attendance Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border p-4 rounded text-center dark:border-white border-black">
            <h3 className="text-lg mb-2">Attended</h3>
            <p className="text-2xl font-bold">{summary.attended}</p>
          </div>
          <div className="border p-4 rounded text-center dark:border-white border-black">
            <h3 className="text-lg mb-2">Missed</h3>
            <p className="text-2xl font-bold">{summary.missed}</p>
          </div>
          <div className="border p-4 rounded text-center dark:border-white border-black">
            <h3 className="text-lg mb-2">Cancelled</h3>
            <p className="text-2xl font-bold">{summary.cancelled}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

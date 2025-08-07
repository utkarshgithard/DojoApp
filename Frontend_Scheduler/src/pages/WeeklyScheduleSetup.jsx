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
      const res = await API.get(`/attendance/summary`);
      const summaryArray = res.data.summary;
      setMarkedSubjects(summaryArray)
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
    // Confirm before marking attendance
    const result = await Swal.fire({
      title: `Mark "${subject.subjectName || subject.subject}" as "${status}"?`,
      text: "This action cannot be undone.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
    });

    if (!result.isConfirmed) return;

    // Call API to mark attendance
    await API.post('/attendance/mark', {
      date,
      status: [{
        subject: subject.subjectName || subject.subject,  // use subject name as string
        status  // attendance status: 'attended', 'missed', or 'cancelled'
      }]
    });

    // Remove subject from unmarkedSubjects immediately
    setUnmarkedSubjects(prev => prev.filter(s => s._id !== subject._id));

    // Add subject to markedSubjects with status
    setMarkedSubjects(prev => [...prev, { ...subject, status }]);

    Swal.fire('Success', 'Attendance marked successfully.', 'success');

  } catch (error) {
    console.error("Error marking attendance:", error);
    Swal.fire('Error', 'Could not mark attendance.', 'error');
  }
};

  return (
    <div className="p-4">
      <div className="text-2xl font-bold mb-4">Dashboard</div>

      {/* Date Picker */}
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mb-4 p-2 border rounded"
      />

      {/* Unmarked Subjects */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Today’s Classes</h2>
        {unmarkedSubjects.length === 0 ? (
          <p>No classes scheduled for today.</p>
        ) : (
          unmarkedSubjects.map(subject => (
            <div
              key={subject._id}
              className="border rounded p-3 my-2 shadow-md flex justify-between items-center"
            >
              <div>
                <p className="font-semibold text-lg">
                  {subject.subjectName || subject.subject}
                </p>
                <p className="text-gray-600">{subject.time}</p>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => handleAttendance(subject, 'attended')}
                  className="bg-green-500 text-white px-3 py-1 rounded"
                >
                  Attended
                </button>
                <button
                  onClick={() => handleAttendance(subject, 'missed')}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Missed
                </button>
                <button
                  onClick={() => handleAttendance(subject, 'cancelled')}
                  className="bg-gray-500 text-white px-3 py-1 rounded"
                >
                  Cancelled
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Marked Subjects */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Marked Attendance</h2>
        {markedSubjects.length === 0 ? (
          <p>No attendance marked yet.</p>
        ) : (
          markedSubjects.map(subject => (
            <div
              key={subject._id}
              className="border p-3 my-2 rounded shadow-sm flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{subject.subject}</p>
                <p className="text-gray-500">{subject.time}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-white ${
                subject.status === 'attended' ? 'bg-green-500' :
                subject.status === 'missed' ? 'bg-red-500' :
                'bg-gray-500'
              }`}>
                {subject.status}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Summary Section */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Attendance Summary</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-100 p-4 rounded text-center">
            <h3 className="text-green-700 text-lg">Attended</h3>
            <p className="text-2xl font-bold">{summary.attended}</p>
          </div>
          <div className="bg-red-100 p-4 rounded text-center">
            <h3 className="text-red-700 text-lg">Missed</h3>
            <p className="text-2xl font-bold">{summary.missed}</p>
          </div>
          <div className="bg-gray-100 p-4 rounded text-center">
            <h3 className="text-gray-700 text-lg">Cancelled</h3>
            <p className="text-2xl font-bold">{summary.cancelled}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;  
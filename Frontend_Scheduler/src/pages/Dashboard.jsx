import React from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { useAttendance } from '../context/AttendanceContext';
import SubjectStatsChart from '../components/SubjectStatsChart';
import CreateStudySession from '../components/CreateStudySession';

const Dashboard = () => {
  const { darkMode } = useDarkMode();
  const { date, setDate, unmarkedSubjects, markedSubjects, handleAttendance, sessions } = useAttendance();

  return (
    <div className={`py-20 px-4 md:px-10 min-h-screen mx-auto transition-colors duration-300 ${darkMode ? 'dark bg-gray-800 text-white' : 'bg-white text-black'}`}>
      <div className="text-2xl font-bold mb-6">Dashboard</div>

      {/* Date Picker */}
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mb-6 p-2 border rounded w-full md:w-64 bg-transparent dark:bg-transparent border-black dark:border-white text-black dark:text-white"
      />

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left Column: Attendance */}
        <div className="space-y-8">
          {/* Unmarked Subjects */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Today’s Classes</h2>
            {unmarkedSubjects.length === 0 ? <p>No classes scheduled for today.</p> :
              <div className="space-y-4">
                {unmarkedSubjects.map(subject => (
                  <div key={subject._id} className="border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 dark:border-white border-black">
                    <div>
                      <p className="font-semibold text-lg">{subject.subjectName || subject.subject}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{subject.time}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap mt-2 sm:mt-0">
                      {['attended', 'missed', 'cancelled'].map(status => (
                        <button
                          key={status}
                          onClick={() => handleAttendance(subject, status)}
                          className="border border-black dark:border-white px-4 py-1 rounded hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            }
          </section>

          {/* Marked Subjects */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Marked Attendance</h2>
            {markedSubjects.length === 0 ? <p>No attendance marked yet.</p> :
              <div className="space-y-4">
                {markedSubjects.map(subject => (
                  <div key={subject._id} className="border rounded-lg p-4 flex justify-between items-center dark:border-white border-black">
                    <div>
                      <p className="font-semibold text-lg">{subject.subject}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{subject.time}</p>
                    </div>
                    <span className={`px-4 py-1 rounded-full border text-sm uppercase ${
                      subject.status === 'attended' ? 'border-green-500 text-green-600' :
                      subject.status === 'missed' ? 'border-red-500 text-red-600' :
                      'border-gray-500 text-gray-600'
                    }`}>{subject.status}</span>
                  </div>
                ))}
              </div>
            }
          </section>
        </div>

        {/* Right Column: Study Sessions & Stats */}
        <div className="space-y-8">
          {/* Study With Friends */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Study With Friends</h2>
            <CreateStudySession />
            <div className="mt-6 space-y-4">
              {sessions.length === 0 ? <p>No upcoming study sessions.</p> :
                sessions.map(session => (
                  <div key={session._id} className="border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 dark:border-white border-black">
                    <div>
                      <p className="font-semibold">{session.subject}</p>
                      <p className="text-sm text-gray-500">{new Date(session.date).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Duration: {session.duration} min</p>
                      <p className="text-sm text-gray-500">Invited: {session.invitedFriends.length}</p>
                    </div>
                  </div>
                ))
              }
            </div>
          </section>

          {/* Attendance Chart */}
          <section>
            <SubjectStatsChart />
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
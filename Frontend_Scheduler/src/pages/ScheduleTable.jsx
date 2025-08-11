import React, { useEffect, useState } from "react";
import API from "../api/axios";

const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

const ScheduleTable = ({ userId }) => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = async () => {
    try {
      const res = await API.get("/schedule/calender");
      setSchedule(res.data.schedule);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCalendar();
  }, [userId]);

  const handleDeleteSubject = async (subjectId, day) => {
    if (!window.confirm("Are you sure you want to delete this subject?")) return;

    try {
      await API.delete(`/schedule/${subjectId}/${day}`);
      setSchedule(prev => ({
        ...prev,
        [day]: prev[day].filter(sub => sub._id !== subjectId)
      }));
    } catch (err) {
      console.error("Failed to delete subject:", err);
    }
  };

  if (loading) return <p className="text-center mt-60 text-xl">Loading schedule...</p>;
  if (!schedule) return <p className="text-center mt-60 text-8xl">No schedule found.</p>;

  return (
    <div className=" mx-auto px-10 py-20 dark:bg-gray-900 rounded-lg shadow-md">
      {daysOfWeek.map(day => (
        <section key={day} className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 border-b-2 border-blue-500 dark:border-blue-400 pb-1 text-gray-800 dark:text-gray-200">
            {capitalize(day)}
          </h2>

          {schedule[day]?.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {schedule[day].map(subject => (
                <div
                  key={subject._id}
                  className="flex items-center space-x-3 bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-xl shadow hover:shadow-lg transition-all cursor-pointer hover:bg-red-500"
                  onClick={() => handleDeleteSubject(subject._id, day)}
                  title={`Click to delete ${subject.name}`}
                >
                  <span className="font-medium text-lg">{subject.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">No subjects scheduled.</p>
          )}
        </section>
      ))}
    </div>
  );
};

export default ScheduleTable;

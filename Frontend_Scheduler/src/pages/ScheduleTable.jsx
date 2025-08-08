import React, { useEffect, useState } from "react";
import API from "../api/axios";

const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

const ScheduleTable = ({ userId }) => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetCalender = async () => {
    try {
      const res = await API.get("/schedule/calender");
      setSchedule(res.data.schedule);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetCalender();
  }, [userId]);

  if (loading) return <p className="text-center mt-8">Loading schedule...</p>;
  if (!schedule) return <p className="text-center mt-8">No schedule found.</p>;

  return (
    <div className="max-w-4xl mx-auto mt-20 p-4 bg-white dark:bg-gray-900 rounded-lg shadow-md">
      {daysOfWeek.map((day) => (
        <section key={day} className="mb-8">
          {/* Day Header */}
          <h2 className="text-2xl font-semibold mb-4 border-b-2 border-blue-500 dark:border-blue-400 pb-1 text-gray-800 dark:text-gray-200">
            {capitalize(day)}
          </h2>

          {/* Subjects List */}
          {schedule[day]?.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {schedule[day].map((subject) => (
                <div
                  key={subject._id}
                  className="flex items-center space-x-3 bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-xl shadow hover:shadow-lg transition-shadow cursor-pointer"
                  title={subject.description || "Subject details"}
                >
                  {/* Optional icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 14l9-5-9-5-9 5 9 5z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 14l6.16-3.422a12.083 12.083 0 01.34 6.364c-.214 1.02-.813 1.953-1.64 2.658L12 14z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7" />
                  </svg>

                  {/* Subject Name */}
                  <span className="font-medium text-lg">{subject.name || subject.title || "Subject Name"}</span>
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

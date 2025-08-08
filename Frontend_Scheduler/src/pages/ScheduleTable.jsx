import React, { useEffect, useState } from "react";
import API from "../api/axios";
import { motion, AnimatePresence } from "framer-motion";

const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

const ScheduleTable = ({ userId }) => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subjectToDelete, setSubjectToDelete] = useState(null);

  const fetchCalendar = async () => {
    try {
      const res = await API.get("/schedule/calender");
      setSchedule(res.data.schedule);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const deleteSubject = async (subjectId, day) => {
    try {
      await API.delete(`/schedule/subject/${subjectId}`);
      setSchedule((prev) => ({
        ...prev,
        [day]: prev[day].filter((sub) => sub._id !== subjectId)
      }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [userId]);

  if (loading) return <p className="text-center mt-8">Loading schedule...</p>;
  if (!schedule) return <p className="text-center mt-8">No schedule found.</p>;

  return (
    <div className="max-w-4xl mx-auto mt-20 p-4 bg-white dark:bg-gray-900 rounded-lg shadow-md">
      {daysOfWeek.map((day) => (
        <section key={day} className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 border-b-2 border-blue-500 dark:border-blue-400 pb-1 text-gray-800 dark:text-gray-200">
            {capitalize(day)}
          </h2>

          {schedule[day]?.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              <AnimatePresence>
                {schedule[day].map((subject) => (
                  <motion.div
                    key={subject._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center space-x-3 bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-xl shadow hover:shadow-lg transition-shadow"
                  >
                    <span className="font-medium text-lg">
                      {subject.name || "Subject Name"}
                    </span>

                    {/* Delete button */}
                    <button
                      onClick={() => setSubjectToDelete({ id: subject._id, day })}
                      className="ml-2 text-red-300 hover:text-red-500 transition"
                      title="Delete subject"
                    >
                      ✕
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">No subjects scheduled.</p>
          )}
        </section>
      ))}

      {/* Confirmation Modal */}
      {subjectToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm text-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Delete this subject?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  deleteSubject(subjectToDelete.id, subjectToDelete.day);
                  setSubjectToDelete(null);
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setSubjectToDelete(null)}
                className="bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-200 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleTable;

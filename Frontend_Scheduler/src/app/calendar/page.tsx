"use client";

import React, { useEffect, useState } from "react";
import API from "@/lib/axios";
import { useAuth } from "@/context/authContext";
import { useAttendance } from "@/context/AttendanceContext";
import { useRouter } from "next/navigation";

const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export default function CalendarPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth() as any;
  const { calendarData: schedule, setCalendarData: setSchedule, fetchSummary } = useAttendance() as any;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleDeleteSubject = async (subjectId: string, day: string) => {
    if (!window.confirm("Are you sure you want to delete this subject?")) return;

    try {
      await API.delete(`/schedule/${subjectId}/${day}`);
      setSchedule((prev: any) => ({
        ...prev,
        [day]: prev[day].filter((sub: any) => (sub.id || sub._id) !== subjectId)
      }));
      await fetchSummary();
    } catch (err) {
      console.error("Failed to delete subject:", err);
    }
  };

  if (!schedule) return <p className="text-center mt-60 text-xl text-gray-500">Loading schedule...</p>;

  return (
    <div className="mx-auto px-10 py-20 min-h-screen dark:bg-gray-900 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-8 dark:text-white">Study Calendar</h1>
      {daysOfWeek.map(day => (
        <section key={day} className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 border-b-2 border-blue-500 dark:border-blue-400 pb-1 text-gray-800 dark:text-gray-200">
            {capitalize(day)}
          </h2>

          {schedule[day]?.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {schedule[day].map((subject: any, idx: number) => {
                const subjectId = subject.id || subject._id;
                return (
                  <div
                    key={`${subjectId}-${idx}`}
                    className="flex items-center space-x-3 bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-xl shadow hover:shadow-lg transition-all cursor-pointer hover:bg-red-500"
                    onClick={() => subjectId && handleDeleteSubject(subjectId, day)}
                    title={`Click to delete ${subject.name || subject.subjectName || subject.subject}`}
                  >
                    <span className="font-medium text-lg">{subject.name || subject.subjectName || subject.subject}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">No subjects scheduled.</p>
          )}
        </section>
      ))}
    </div>
  );
}

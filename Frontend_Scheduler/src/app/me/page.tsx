"use client";

import { useState } from "react";
import { BookOpen, CalendarDays } from "lucide-react";
import CalendarPage from "@/app/calendar/page";
import ExamPrepPage from "@/app/exam-prep/page";
import { useDarkMode } from "@/context/DarkModeContext";

type MeSection = "class" | "exam";

export default function MePage() {
  const { darkMode } = useDarkMode() as any;
  const [section, setSection] = useState<MeSection>("class");
  const dark = darkMode;

  return (
    <div className={`min-h-screen ${dark ? "bg-black text-white" : "bg-white text-gray-900"}`}>
      <div className="sticky top-0 z-20 flex justify-center px-4 pt-[62px] pb-3 backdrop-blur-xl md:py-3">
        <div className={`flex gap-1 rounded-full border p-1 ${dark ? "border-zinc-800 bg-zinc-950" : "border-gray-200 bg-gray-50"}`}>
          <button
            type="button"
            onClick={() => setSection("class")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              section === "class"
                ? dark ? "bg-white text-black" : "bg-black text-white"
                : dark ? "text-zinc-400" : "text-gray-500"
            }`}
          >
            <CalendarDays size={15} />
            Class
          </button>
          <button
            type="button"
            onClick={() => setSection("exam")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              section === "exam"
                ? dark ? "bg-white text-black" : "bg-black text-white"
                : dark ? "text-zinc-400" : "text-gray-500"
            }`}
          >
            <BookOpen size={15} />
            Exam
          </button>
        </div>
      </div>

      {section === "class" ? <CalendarPage /> : <ExamPrepPage />}
    </div>
  );
}

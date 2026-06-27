"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type TaskDifficulty = "Easy" | "Medium" | "Hard" | "None";

export interface CalendarTask {
  id: string;
  text: string;
  difficulty: TaskDifficulty;
  isChecked: boolean;
  isPracticeTest?: boolean;
}

export interface DayData {
  isPracticeTest?: boolean;
  tasks: CalendarTask[];
}

type CalendarData = Record<string, DayData>; // Key: YYYY-MM-DD

interface CalendarContextProps {
  calendarData: CalendarData;
  setCalendarData: React.Dispatch<React.SetStateAction<CalendarData>>;
  addTask: (date: string, text: string, difficulty: TaskDifficulty) => void;
  toggleTask: (date: string, taskId: string) => void;
  deleteTask: (date: string, taskId: string) => void;
  importAIPlan: (plan: any) => void;
  clearCalendar: () => void;
  clearAITasks: () => void;
}

const CalendarContext = createContext<CalendarContextProps | undefined>(undefined);

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [mounted, setMounted] = useState(false);

  // Load from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("master_calendar_data");
      if (stored) {
        setCalendarData(JSON.parse(stored));
      }
      setMounted(true);
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("master_calendar_data", JSON.stringify(calendarData));
    }
  }, [calendarData, mounted]);

  const addTask = (date: string, text: string, difficulty: TaskDifficulty) => {
    setCalendarData((prev) => {
      const day = prev[date] || { tasks: [] };
      return {
        ...prev,
        [date]: {
          ...day,
          tasks: [...day.tasks, { id: Date.now().toString(), text, difficulty, isChecked: false }],
        },
      };
    });
  };

  const toggleTask = (date: string, taskId: string) => {
    setCalendarData((prev) => {
      const day = prev[date];
      if (!day) return prev;
      return {
        ...prev,
        [date]: {
          ...day,
          tasks: day.tasks.map((t) => (t.id === taskId ? { ...t, isChecked: !t.isChecked } : t)),
        },
      };
    });
  };

  const deleteTask = (date: string, taskId: string) => {
    setCalendarData((prev) => {
      const day = prev[date];
      if (!day) return prev;
      return {
        ...prev,
        [date]: {
          ...day,
          tasks: day.tasks.filter((t) => t.id !== taskId),
        },
      };
    });
  };

  const importAIPlan = (plan: any) => {
    const newData: CalendarData = { ...calendarData }; // Merge with existing manual tasks, or just overwrite? Overwriting AI tasks is fine, but merging is better. Let's merge.

    if (plan && plan.weeks) {
      plan.weeks.forEach((week: any) => {
        week.days.forEach((day: any) => {
          const dateStr = day.date; // YYYY-MM-DD
          const existingDay = newData[dateStr] || { tasks: [] };

          const newTasks = day.tasks.map((t: any, idx: number) => ({
            id: `ai-${Date.now()}-${idx}-${Math.random()}`,
            text: t.text,
            difficulty: t.difficulty,
            isChecked: false,
            isPracticeTest: day.isPracticeTest,
          }));

          newData[dateStr] = {
            isPracticeTest: day.isPracticeTest || existingDay.isPracticeTest,
            tasks: [...existingDay.tasks, ...newTasks],
          };
        });
      });
    }

    setCalendarData(newData);
  };

  const clearCalendar = () => setCalendarData({});

  const clearAITasks = () => {
    setCalendarData((prev) => {
      const newData: CalendarData = {};
      Object.keys(prev).forEach((date) => {
        const day = prev[date];
        const filteredTasks = day.tasks.filter((t) => !t.id.startsWith("ai-"));
        if (filteredTasks.length > 0 || day.isPracticeTest) {
          newData[date] = {
            ...day,
            tasks: filteredTasks,
            // If the only thing that made this a practice test was the AI plan, you might want to clear it, but let's keep it safe.
            isPracticeTest: filteredTasks.length === 0 ? false : day.isPracticeTest,
          };
        }
      });
      return newData;
    });
  };

  return (
    <CalendarContext.Provider value={{ calendarData, setCalendarData, addTask, toggleTask, deleteTask, importAIPlan, clearCalendar, clearAITasks }}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendarContext = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendarContext must be used within a CalendarProvider");
  }
  return context;
};

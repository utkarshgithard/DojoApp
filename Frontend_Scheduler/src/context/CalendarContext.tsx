"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./authContext";
import API from "@/lib/axios";

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
  addTask: (date: string, text: string, difficulty: TaskDifficulty) => Promise<void>;
  toggleTask: (date: string, taskId: string) => Promise<void>;
  deleteTask: (date: string, taskId: string) => Promise<void>;
  importAIPlan: (plan: any) => Promise<void>;
  clearCalendar: () => Promise<void>;
  clearAITasks: () => Promise<void>;
}

const CalendarContext = createContext<CalendarContextProps | undefined>(undefined);

const transformDbTasks = (dbTasks: any[]): CalendarData => {
  const data: CalendarData = {};
  dbTasks.forEach((t) => {
    const date = t.date;
    if (!data[date]) {
      data[date] = { tasks: [] };
    }
    data[date].tasks.push({
      id: t.id,
      text: t.text,
      difficulty: t.difficulty as TaskDifficulty,
      isChecked: t.isChecked,
      isPracticeTest: t.isPracticeTest,
    });
    if (t.isPracticeTest) {
      data[date].isPracticeTest = true;
    }
  });
  return data;
};

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth() as any;
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [mounted, setMounted] = useState(false);

  // Fetch tasks from API if authenticated, otherwise load from local storage
  useEffect(() => {
    const loadTasks = async () => {
      if (isAuthenticated && token) {
        try {
          const res = await API.get('/calendar');
          const data = transformDbTasks(res.data);
          setCalendarData(data);
        } catch (err) {
          console.error("Failed to load tasks from DB:", err);
        }
      } else {
        // Fallback for guests
        const stored = localStorage.getItem("master_calendar_data");
        if (stored) {
          setCalendarData(JSON.parse(stored));
        }
      }
      setMounted(true);
    };

    loadTasks();
  }, [token, isAuthenticated]);

  // Save to local storage ONLY for guest/offline fallback
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      localStorage.setItem("master_calendar_data", JSON.stringify(calendarData));
    }
  }, [calendarData, mounted, isAuthenticated]);

  const addTask = async (date: string, text: string, difficulty: TaskDifficulty) => {
    if (isAuthenticated) {
      try {
        const res = await API.post('/calendar', { date, text, difficulty });
        const newTask = res.data;
        setCalendarData((prev) => {
          const day = prev[date] || { tasks: [] };
          return {
            ...prev,
            [date]: {
              ...day,
              tasks: [
                ...day.tasks,
                {
                  id: newTask.id,
                  text: newTask.text,
                  difficulty: newTask.difficulty as TaskDifficulty,
                  isChecked: newTask.isChecked,
                  isPracticeTest: newTask.isPracticeTest,
                },
              ],
            },
          };
        });
      } catch (err) {
        console.error("Failed to add task to DB:", err);
      }
    } else {
      // Guest local update
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
    }
  };

  const toggleTask = async (date: string, taskId: string) => {
    if (isAuthenticated) {
      try {
        await API.put(`/calendar/${taskId}/toggle`);
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
      } catch (err) {
        console.error("Failed to toggle task in DB:", err);
      }
    } else {
      // Guest local update
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
    }
  };

  const deleteTask = async (date: string, taskId: string) => {
    if (isAuthenticated) {
      try {
        await API.delete(`/calendar/${taskId}`);
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
      } catch (err) {
        console.error("Failed to delete task in DB:", err);
      }
    } else {
      // Guest local update
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
    }
  };

  const importAIPlan = async (plan: any) => {
    if (isAuthenticated) {
      try {
        const res = await API.post('/calendar/import-ai', { plan });
        const data = transformDbTasks(res.data);
        setCalendarData(data);
      } catch (err) {
        console.error("Failed to import AI plan to DB:", err);
      }
    } else {
      // Guest local update
      const newData: CalendarData = { ...calendarData };
      if (plan && plan.weeks) {
        plan.weeks.forEach((week: any) => {
          week.days.forEach((day: any) => {
            const dateStr = day.date;
            const existingDay = newData[dateStr] || { tasks: [] };

            const newTasks = day.tasks.map((t: any, idx: number) => ({
              id: `ai-${Date.now()}-${idx}-${Math.random()}`,
              text: t.text,
              difficulty: t.difficulty as TaskDifficulty,
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
    }
  };

  const clearCalendar = async () => {
    if (isAuthenticated) {
      try {
        await API.post('/calendar/clear-all');
        setCalendarData({});
      } catch (err) {
        console.error("Failed to clear calendar in DB:", err);
      }
    } else {
      setCalendarData({});
    }
  };

  const clearAITasks = async () => {
    if (isAuthenticated) {
      try {
        await API.post('/calendar/clear-ai');
        setCalendarData((prev) => {
          const newData: CalendarData = {};
          Object.keys(prev).forEach((date) => {
            const day = prev[date];
            const filteredTasks = day.tasks.filter((t) => !t.id.startsWith("ai-"));
            if (filteredTasks.length > 0 || day.isPracticeTest) {
              newData[date] = {
                ...day,
                tasks: filteredTasks,
                isPracticeTest: filteredTasks.length === 0 ? false : day.isPracticeTest,
              };
            }
          });
          return newData;
        });
      } catch (err) {
        console.error("Failed to clear AI tasks in DB:", err);
      }
    } else {
      setCalendarData((prev) => {
        const newData: CalendarData = {};
        Object.keys(prev).forEach((date) => {
          const day = prev[date];
          const filteredTasks = day.tasks.filter((t) => !t.id.startsWith("ai-"));
          if (filteredTasks.length > 0 || day.isPracticeTest) {
            newData[date] = {
              ...day,
              tasks: filteredTasks,
              isPracticeTest: filteredTasks.length === 0 ? false : day.isPracticeTest,
            };
          }
        });
        return newData;
      });
    }
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

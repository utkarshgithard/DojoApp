"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDarkMode } from "@/context/DarkModeContext";
import API from "@/lib/axios";
import { TrendingUp, Flame, CheckCircle, HelpCircle } from "lucide-react";

import { useCalendarContext } from "@/context/CalendarContext";

interface PerformanceData {
  date: string;
  dayName: string;
  score: number;
  tasksCompleted: number;
  tasksTotal: number;
  sessionsCount: number;
  studyHours?: number;
  lectureScore?: number;
  taskPoints?: number;
  sessionPoints?: number;
  communityPoints?: number;
  postedToday?: boolean;
  lectureAwarded?: boolean;
}

export default function PerformanceIndexChart() {
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;
  const { calendarData } = useCalendarContext();
  const [cachedData, setCachedData] = useState<PerformanceData[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const cached = localStorage.getItem("performance-index-cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        setCachedData(parsed.data as PerformanceData[]);
      }
    } catch {
      // Ignore cache read issues
    }
  }, []);

  // Summarize checklist completed/total counts for the last 7 days from CalendarContext
  const tasksSummary = useMemo(() => {
    const summary: Record<string, { completed: number; total: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      const dayData = calendarData[dateStr];
      const dayTasks = dayData?.tasks || [];
      summary[dateStr] = {
        completed: dayTasks.filter((t: any) => t.isChecked).length,
        total: dayTasks.length
      };
    }
    return summary;
  }, [calendarData]);

  // Construct dynamic SWR key to automatically trigger fetch on task updates
  const swrKey = useMemo(() => {
    return `/auth/performance-index?tasksData=${encodeURIComponent(JSON.stringify(tasksSummary))}`;
  }, [tasksSummary]);

  const fetcher = async (url: string) => {
    const res = await API.get(url);
    if (!res.data?.success) {
      throw new Error("Failed to fetch performance index");
    }
    const nextData = res.data.data as PerformanceData[];
    if (typeof window !== "undefined") {
      localStorage.setItem("performance-index-cache", JSON.stringify({ timestamp: Date.now(), data: nextData }));
    }
    return nextData;
  };

  const { data = cachedData, isLoading } = useSWR<PerformanceData[]>(swrKey, fetcher, {
    fallbackData: cachedData,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    keepPreviousData: true,
  });

  // Calculate stats for today (the last element in the array)
  const todayStats = useMemo(() => {
    if (data.length === 0) return null;
    return data[data.length - 1];
  }, [data]);

  // Calculate the change compared to 1 day ago
  const trendPercent = useMemo(() => {
    if (data.length < 2) return 0;
    const todayScore = data[data.length - 1].score;
    const yesterdayScore = data[data.length - 2].score;
    const diff = todayScore - yesterdayScore;
    return diff;
  }, [data]);

  const border = dark ? "border-gray-800" : "border-gray-200";
  const muted = dark ? "text-gray-400" : "text-gray-500";

  // Gold color styling
  const goldColor = "#d97706"; // amber-600

  if (isLoading && data.length === 0) {
    return (
      <div className={`p-6 border rounded-xl ${border} ${dark ? "bg-black" : "bg-white"} h-[350px] flex items-center justify-center`}>
        <span className="inline-block w-6 h-6 rounded-full border-[2px] border-current border-t-transparent animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className={`border rounded-xl p-5 ${border} ${dark ? "bg-black" : "bg-white"}`}>
      {/* Gold Market Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-[11px] uppercase tracking-widest ${muted} font-bold`}>
              Activeness & Performance Index
            </span>
            <div className="group relative cursor-pointer">
              <HelpCircle size={13} className={muted} />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-[220px] p-2 text-[10.5px] rounded-lg shadow-xl bg-zinc-900 text-zinc-350 border border-zinc-800 leading-normal z-50">
                Calculated daily from tasks completed and study sessions attended.
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-serif tracking-tight text-amber-500 dark:text-amber-400">
              {todayStats ? todayStats.score : 0}
            </span>
            <span className="text-xs text-zinc-400">INDEX PTS</span>
            {trendPercent !== 0 && (
              <span className={`text-xs font-semibold flex items-center gap-0.5 ml-1 ${trendPercent > 0 ? "text-green-500" : "text-rose-500"}`}>
                <TrendingUp size={13} className={trendPercent < 0 ? "rotate-180" : ""} />
                {trendPercent > 0 ? "+" : ""}{trendPercent} pts vs yesterday
              </span>
            )}
          </div>
        </div>

        {/* Breakdown Badges */}
        {todayStats && (
          <div className="flex flex-wrap gap-2.5">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${border} text-xs`}>
              <CheckCircle size={13} className="text-emerald-500" />
              <span>Tasks: <b>{todayStats.tasksCompleted}/{todayStats.tasksTotal}</b></span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${border} text-xs`}>
              <Flame size={13} className="text-amber-500" />
              <span>Sessions: <b>{todayStats.sessionsCount}</b></span>
            </div>
          </div>
        )}
      </div>

      {/* Gold Price Area Chart */}
      <div className="h-[230px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={goldColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={goldColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? "#1f2937" : "#e5e7eb"} />
            <XAxis
              dataKey="dayName"
              tickLine={false}
              axisLine={false}
              stroke={dark ? "#6b7280" : "#9ca3af"}
              style={{ fontSize: "11px", fontWeight: 500 }}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              stroke={dark ? "#6b7280" : "#9ca3af"}
              style={{ fontSize: "11px", fontWeight: 500 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const day = payload[0].payload as PerformanceData;
                  return (
                    <div className={`p-3 border rounded-lg shadow-xl text-xs space-y-1.5 ${
                      dark ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-800"
                    }`}>
                      <p className="font-bold border-b pb-1 mb-1 border-inherit">{day.date} ({day.dayName})</p>
                      <p className="flex items-center justify-between gap-6">
                        <span>Activeness Index:</span>
                        <span className="font-bold text-amber-500">{day.score} pts</span>
                      </p>
                      <p className="flex items-center justify-between gap-6">
                        <span>Tasks Completed:</span>
                        <span className="font-semibold">{day.tasksCompleted}/{day.tasksTotal}</span>
                      </p>
                      <p className="flex items-center justify-between gap-6">
                        <span>Study Sessions:</span>
                        <span className="font-semibold">{day.sessionsCount}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke={goldColor}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#goldGradient)"
              activeDot={{ r: 5, stroke: dark ? "#000" : "#fff", strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

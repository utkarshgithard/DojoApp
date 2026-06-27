"use client";

import React, { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2, Sparkles, X } from "lucide-react";
import { useCalendarContext, TaskDifficulty, CalendarTask } from "@/context/CalendarContext";
import { useDarkMode } from "@/context/DarkModeContext";

export default function MasterCalendar({ fullView = false }: { fullView?: boolean }) {
  const { darkMode } = useDarkMode() as any;
  const { calendarData, addTask, toggleTask, deleteTask, clearCalendar, clearAITasks } = useCalendarContext();

  const muted = "text-gray-500 dark:text-gray-400";

  const getOngoingWeekIndex = (date: Date) => {
    const monthStart = startOfMonth(date);
    const startDate = startOfWeek(monthStart);
    let day = startDate;
    let rowIndex = 0;
    const today = new Date();
    while (rowIndex < 6) { // Max 6 weeks in a month view
      for (let i = 0; i < 7; i++) {
        if (isSameDay(day, today)) return rowIndex;
        day = addDays(day, 1);
      }
      rowIndex++;
    }
    return 0;
  };

  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedWeekIndex, setExpandedWeekIndex] = useState<number>(() => getOngoingWeekIndex(new Date()));
  const [selectedWeekdayIndex, setSelectedWeekdayIndex] = useState<number>(() => new Date().getDay());
  
  const [mobileFocusDate, setMobileFocusDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getDayLabel = (date: Date) => {
    const today = new Date();
    if (isSameDay(date, today)) return "Today";
    if (isSameDay(date, addDays(today, -1))) return "Yesterday";
    if (isSameDay(date, addDays(today, 1))) return "Tomorrow";
    return format(date, "EEE");
  };

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string>("");
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDifficulty, setNewTaskDifficulty] = useState<TaskDifficulty>("None");

  // View Modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewTask, setViewTask] = useState<{ dateStr: string; task: CalendarTask } | null>(null);

  const openViewTaskModal = (dateStr: string, task: CalendarTask) => {
    setViewTask({ dateStr, task });
    setViewModalOpen(true);
  };

  const scrollToDay = (dayIdx: number) => {
    setSelectedWeekdayIndex(dayIdx);
    setTimeout(() => {
      const elements = document.querySelectorAll(`[id$="-${dayIdx}"]`);
      elements.forEach(el => {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      });
    }, 50);
  };
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const todayIdx = new Date().getDay();
      // Snap to today's day card with 'auto' behavior so it's instant on mount
      const element = document.querySelector(`[id="day-${expandedWeekIndex}-${todayIdx}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [expandedWeekIndex]);

  const nextMonth = () => {
    const next = addMonths(currentDate, 1);
    setCurrentDate(next);
    setExpandedWeekIndex(isSameMonth(next, new Date()) ? getOngoingWeekIndex(next) : 0);
  };
  const prevMonth = () => {
    const prev = subMonths(currentDate, 1);
    setCurrentDate(prev);
    setExpandedWeekIndex(isSameMonth(prev, new Date()) ? getOngoingWeekIndex(prev) : 0);
  };

  // Generate calendar grid dates
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "yyyy-MM-dd";
  const rows: Date[][] = [];
  let days: Date[] = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      days.push(day);
      day = addDays(day, 1);
    }
    rows.push(days);
    days = [];
  }

  const openAddModal = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setNewTaskText("");
    setNewTaskDifficulty("None");
    setIsModalOpen(true);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskText.trim()) {
      addTask(selectedDateStr, newTaskText, newTaskDifficulty);
      setIsModalOpen(false);
    }
  };

  const renderTask = (dateStr: string, task: CalendarTask) => {
    let diffColor = 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-800/85';
    if (task.isPracticeTest) diffColor = 'bg-purple-500/10 text-purple-700 border-purple-500/25 dark:text-purple-400 dark:bg-purple-950/20 dark:border-purple-500/30';
    else if (task.difficulty === 'Easy') diffColor = 'bg-green-500/10 text-green-700 border-green-500/25 dark:text-green-400 dark:bg-green-950/20 dark:border-green-500/30';
    else if (task.difficulty === 'Medium') diffColor = 'bg-yellow-500/10 text-yellow-700 border-yellow-500/25 dark:text-yellow-400 dark:bg-yellow-950/20 dark:border-yellow-500/30';
    else if (task.difficulty === 'Hard') diffColor = 'bg-red-500/10 text-red-700 border-red-500/25 dark:text-red-400 dark:bg-red-950/20 dark:border-red-500/30';

    return (
      <div 
        key={task.id} 
        onClick={(e) => { e.stopPropagation(); openViewTaskModal(dateStr, task); }}
        className={`group flex items-start gap-2 p-2 rounded-lg border shadow-sm transition-all duration-200 hover:scale-[1.04] hover:-translate-y-0.5 hover:shadow-md hover:z-10 relative cursor-pointer ${diffColor} ${task.isChecked ? 'opacity-40 line-through' : ''}`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); toggleTask(dateStr, task.id); }}
          className={`mt-0.5 shrink-0 w-[18px] h-[18px] rounded border flex items-center justify-center transition-colors ${task.isChecked
              ? 'bg-purple-500 border-purple-500 text-white'
              : `border-gray-300 dark:border-gray-600 hover:border-purple-500 bg-white dark:bg-gray-800`
            }`}
        >
          {task.isChecked && <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </button>
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="text-[12.5px] leading-snug font-medium truncate block" title={task.text}>{task.text}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); deleteTask(dateStr, task.id); }}
          className="opacity-0 group-hover:opacity-100 shrink-0 text-red-500 hover:bg-red-500/10 p-0.5 rounded transition-all"
        >
          <Trash2 size={12} />
        </button>
      </div>
    );
  };

  return (
    <div className={`w-full rounded-2xl border mb-8 overflow-hidden shadow-sm ${darkMode ? "bg-gray-950 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`}>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-semibold tracking-tight">
            {format(isMobile ? mobileFocusDate : currentDate, "MMMM yyyy")}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => clearAITasks()} className="text-[11px] px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-purple-500 font-medium">
            Clear AI Plan
          </button>
          <button onClick={() => clearCalendar()} className="text-[11px] px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-red-500 mr-2">
            Clear All
          </button>
          {!isMobile && (
            <>
              <button onClick={prevMonth} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={nextMonth} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grid / Content */}
      <div className="flex flex-col">
        {isMobile ? (
          <div className="flex flex-col">
            {/* Mobile Navigation Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/20 dark:bg-gray-900/10">
              <button 
                onClick={() => setMobileFocusDate(addDays(mobileFocusDate, -1))}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-purple-500"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setMobileFocusDate(new Date())}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-purple-500"
              >
                Snap to Today
              </button>
              <button 
                onClick={() => setMobileFocusDate(addDays(mobileFocusDate, 1))}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-purple-500"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* 3 Day Rows (Yesterday, Today, Tomorrow) */}
            <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-900 bg-white dark:bg-black">
              {[
                addDays(mobileFocusDate, -1),
                mobileFocusDate,
                addDays(mobileFocusDate, 1),
              ].map((day, idx) => {
                const dateStr = format(day, dateFormat);
                const dayData = calendarData[dateStr];
                const tasks = dayData?.tasks || [];
                const isToday = isSameDay(day, new Date());
                const label = getDayLabel(day);

                return (
                  <div key={idx} className="flex items-center gap-4 py-4 px-4 min-w-0">
                    {/* Left: Date Badge */}
                    <div 
                      onClick={() => openAddModal(dateStr)}
                      className={`flex flex-col items-center justify-center w-[54px] h-[58px] rounded-2xl shrink-0 cursor-pointer transition-all active:scale-95 ${
                        isToday 
                          ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-500/20' 
                          : 'text-zinc-700 dark:text-zinc-400'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider leading-none">
                        {label.substring(0, 3)}
                      </span>
                      <span className="text-[19px] font-bold leading-none mt-1">
                        {format(day, "d")}
                      </span>
                    </div>

                    {/* Middle: Horizontal Scrolling Tasks Container */}
                    <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                      {tasks.map((task) => {
                        let diffColor = 'bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800';
                        if (task.isPracticeTest) diffColor = 'bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400 dark:bg-purple-950/20 dark:border-purple-500/30';
                        else if (task.difficulty === 'Easy') diffColor = 'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400 dark:bg-green-950/20 dark:border-green-500/30';
                        else if (task.difficulty === 'Medium') diffColor = 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400 dark:bg-blue-950/20 dark:border-blue-500/30';
                        else if (task.difficulty === 'Hard') diffColor = 'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400 dark:bg-red-950/20 dark:border-red-500/30';

                        return (
                          <div
                            key={task.id}
                            onClick={(e) => { e.stopPropagation(); openViewTaskModal(dateStr, task); }}
                            className={`shrink-0 px-4 py-2 rounded-full border text-[13px] font-medium transition-all active:scale-95 cursor-pointer max-w-[200px] truncate ${diffColor} ${
                              task.isChecked ? 'opacity-40 line-through' : ''
                            }`}
                          >
                            {task.text}
                          </div>
                        );
                      })}

                      {/* Rightmost: Add Task Trigger inside horizontal flow */}
                      <button
                        onClick={() => openAddModal(dateStr)}
                        className="shrink-0 w-8 h-8 rounded-full border border-dashed border-zinc-350 dark:border-zinc-800 text-zinc-400 hover:text-purple-500 hover:border-purple-400 flex items-center justify-center transition-colors active:scale-95"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Mobile Weekday Selector (Approach 3: Focus Day View) */}
            <div className="flex md:hidden items-center justify-between p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/10">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-2">Focus Day:</span>
              <div className="flex gap-1.5 pr-2">
                {rows[0]?.map((day, idx) => {
                  const isSelected = selectedWeekdayIndex === idx;
                  const label = format(day, "EEE"); // "Sun", "Mon", etc.
                  return (
                    <button
                      key={idx}
                      onClick={() => scrollToDay(idx)}
                      className={`text-[12px] font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                        isSelected 
                          ? "bg-purple-500 text-white shadow-sm" 
                          : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {label.substring(0, 1)}
                    </button>
                  );
                })}
              </div>
            </div>

            {rows.map((row, i) => {
              const isExpanded = fullView || expandedWeekIndex === i;

              if (!isExpanded) {
                // Generate summary for collapsed view
                const weekStartStr = format(row[0], "MMM d");
                const weekEndStr = format(row[row.length - 1], "MMM d");

                let colorSummary: string[] = [];
                row.forEach(day => {
                  const dayData = calendarData[format(day, dateFormat)];
                  if (dayData && dayData.tasks) {
                    dayData.tasks.forEach(t => {
                      if (t.difficulty === 'Easy') colorSummary.push('🟢');
                      else if (t.difficulty === 'Medium') colorSummary.push('🟡');
                      else if (t.difficulty === 'Hard') colorSummary.push('🔴');
                      else colorSummary.push('⚪');
                    });
                  }
                });

                return (
                  <div
                    key={i}
                    onClick={() => setExpandedWeekIndex(i)}
                    className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-[12px] font-semibold uppercase tracking-wider ${muted}`}>Week {i + 1}</span>
                      <span className="text-[13px] text-gray-700 dark:text-gray-300">{weekStartStr} – {weekEndStr}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-[12px] tracking-[2px]">{colorSummary.slice(0, 10).join('')}{colorSummary.length > 10 ? '...' : ''}</div>
                      <ChevronRight size={14} className="text-gray-400" />
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} className={`flex flex-col border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${fullView ? 'mb-4 last:mb-0 border rounded-xl' : ''}`}>
                  {/* Expanded Week Header */}
                  {!fullView && (
                    <div
                      className="flex items-center justify-between p-2 bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-800"
                    >
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${muted} ml-2`}>Week {i + 1} (Expanded)</span>
                    </div>
                  )}
                  <div className="flex flex-row w-full p-2 md:p-0 gap-1.5 md:gap-0">
                    {row.map((day, j) => {
                      const dateStr = format(day, dateFormat);
                      const dayData = calendarData[dateStr];
                      const isCurrentMonth = isSameMonth(day, monthStart);
                      const isToday = isSameDay(day, new Date());

                      const hasTasks = dayData?.tasks && dayData.tasks.length > 0;
                      const flexWeight = hasTasks ? 3 : 1;

                      const allChecked = hasTasks && dayData.tasks.every(t => t.isChecked);
                      const bgClass = allChecked
                        ? (darkMode ? 'bg-gray-900/30 opacity-70' : 'bg-gray-50 opacity-70')
                        : dayData?.isPracticeTest
                          ? (darkMode ? 'bg-purple-900/10' : 'bg-purple-50/50')
                          : (darkMode ? 'hover:bg-gray-900/20' : 'hover:bg-gray-50');

                      return (
                        <div
                          key={j}
                          id={`day-${i}-${j}`}
                          style={{ '--flex-weight': flexWeight } as React.CSSProperties}
                          className={`min-h-[120px] md:min-h-[100px] p-2.5 md:p-2 border border-gray-100 dark:border-gray-850 md:border-0 md:border-r last:border-r-0 md:last:border-r-0 relative transition-all duration-300 w-auto flex-1 min-w-0 md:flex-[var(--flex-weight)] rounded-xl md:rounded-none shadow-sm md:shadow-none ${!isCurrentMonth ? 'opacity-40 bg-gray-50/50 dark:bg-gray-900/10' : bgClass}`}
                          onClick={() => openAddModal(dateStr)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`uppercase font-bold tracking-wider transition-all ${
                                hasTasks 
                                  ? 'text-[11px] text-purple-500/80 dark:text-purple-400/80 font-black' 
                                  : 'text-[10px] text-gray-400'
                              }`}>
                                {format(day, "EEE")}
                              </span>
                              <span className={`flex items-center justify-center rounded-full transition-all ${
                                isToday 
                                  ? 'bg-purple-500 text-white w-7 h-7 text-[13px] font-semibold' 
                                  : hasTasks 
                                    ? 'text-[15px] font-bold text-purple-600 dark:text-purple-400 w-7 h-7' 
                                    : 'text-[12px] font-medium text-gray-700 dark:text-gray-300 w-6 h-6'
                              }`}>
                                {format(day, "d")}
                              </span>
                            </div>
                            {dayData?.isPracticeTest && <Sparkles size={12} className="text-purple-500" />}
                          </div>

                          <div className="space-y-1 pb-6">
                            {dayData?.tasks.map(task => renderTask(dateStr, task))}
                          </div>

                          <button
                            onClick={(e) => { e.stopPropagation(); openAddModal(dateStr); }}
                            className="absolute bottom-1 right-1 p-1 rounded opacity-0 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-all"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`w-full max-w-sm rounded-xl p-5 shadow-xl ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Add Task to {format(parseISO(selectedDateStr), "MMM d, yyyy")}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-4">
              <input
                type="text"
                placeholder="Task description..."
                autoFocus
                required
                value={newTaskText}
                onChange={e => setNewTaskText(e.target.value)}
                className={`w-full text-sm p-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}
              />
              <div className="flex gap-2">
                <select
                  value={newTaskDifficulty}
                  onChange={e => setNewTaskDifficulty(e.target.value as TaskDifficulty)}
                  className={`flex-1 text-sm p-2.5 rounded-lg border focus:outline-none ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}
                >
                  <option value="None">No Difficulty</option>
                  <option value="Easy">Easy 🟢</option>
                  <option value="Medium">Medium 🟡</option>
                  <option value="Hard">Hard 🔴</option>
                </select>
                <button type="submit" className="px-4 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* View Task Details Modal */}
      {viewModalOpen && viewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewModalOpen(false)}>
          <div 
            className={`w-full max-w-sm rounded-xl p-5 shadow-xl ${darkMode ? 'bg-gray-900 border border-gray-800 text-white' : 'bg-white text-gray-900'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 border-b pb-2 border-gray-100 dark:border-gray-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Task Details</h3>
              <button onClick={() => setViewModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className={`text-[11px] uppercase tracking-wider text-gray-400 mb-0.5`}>
                  {format(parseISO(viewTask.dateStr), "MMMM d, yyyy")}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    viewTask.task.isPracticeTest ? 'bg-purple-500/10 text-purple-700 border border-purple-500/20 dark:text-purple-400 dark:bg-purple-950/20 dark:border-purple-500/30' :
                    viewTask.task.difficulty === 'Hard' ? 'bg-red-500/10 text-red-700 border border-red-500/20 dark:text-red-400 dark:bg-red-950/20 dark:border-red-500/30' :
                    viewTask.task.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-700 border border-yellow-500/20 dark:text-yellow-400 dark:bg-yellow-950/20 dark:border-yellow-500/30' :
                    viewTask.task.difficulty === 'Easy' ? 'bg-green-500/10 text-green-700 border border-green-500/20 dark:text-green-400 dark:bg-green-950/20 dark:border-green-500/30' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}>
                    {viewTask.task.isPracticeTest ? 'Practice Test 📝' : `${viewTask.task.difficulty} Difficulty`}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    viewTask.task.isChecked 
                      ? 'bg-green-500/10 text-green-500 border border-green-500/20 dark:text-green-400 dark:bg-green-950/20 dark:border-green-500/30' 
                      : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/10'
                  }`}>
                    {viewTask.task.isChecked ? 'Completed ✅' : 'Pending ⏳'}
                  </span>
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-gray-50 border-gray-150'}`}>
                <p className="text-[14px] leading-relaxed font-medium break-words whitespace-pre-wrap">
                  {viewTask.task.text}
                </p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => {
                    toggleTask(viewTask.dateStr, viewTask.task.id);
                    setViewTask(prev => prev ? { 
                      ...prev, 
                      task: { ...prev.task, isChecked: !prev.task.isChecked } 
                    } : null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                    viewTask.task.isChecked
                      ? 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20'
                      : 'bg-purple-500 hover:bg-purple-600 text-white border-transparent'
                  }`}
                >
                  {viewTask.task.isChecked ? 'Mark Incomplete' : 'Mark Completed'}
                </button>
                <button
                  onClick={() => {
                    deleteTask(viewTask.dateStr, viewTask.task.id);
                    setViewModalOpen(false);
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 active:scale-95 flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

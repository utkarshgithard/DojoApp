"use client";

import React, { useState } from 'react';
import { useDarkMode } from '@/context/DarkModeContext';
import { ClipboardList, Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import { useCalendarContext } from '@/context/CalendarContext';

interface NotesSectionProps {
  date: string;
  cardClass: string;
  muted: string;
}

export default function NotesSection({ date, cardClass, muted }: NotesSectionProps) {
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;

  const { calendarData, addTask, toggleTask, deleteTask } = useCalendarContext();
  const [newTodoText, setNewTodoText] = useState('');

  // Extract tasks for the current date from the CalendarContext
  const todos = calendarData[date]?.tasks || [];

  const handleAddTodo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newTodoText.trim();
    if (!text) return;

    if (text.length > 200) {
      alert("Task name is too long (max 200 characters).");
      return;
    }

    // Default to 'Medium' difficulty for dashboard checklists
    addTask(date, text, 'Medium');
    setNewTodoText('');
  };

  const handleToggle = (taskId: string) => {
    toggleTask(date, taskId);
  };

  const handleDelete = (taskId: string) => {
    deleteTask(date, taskId);
  };

  // ── Counters ───────────────────────────────────────────────────────────────
  const completedCount = todos.filter((t: any) => t.isChecked).length;
  const totalCount = todos.length;

  return (
    <section className={`${cardClass} flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${dark ? 'bg-white/5' : 'bg-gray-100'}`}>
            <ClipboardList size={15} className={muted} />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold tracking-tight">Daily Checklist</h2>
          </div>
        </div>
        {totalCount > 0 && (
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-all ${
            completedCount === totalCount
              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
              : dark ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-100 text-gray-600'
          }`}>
            {completedCount}/{totalCount} done
          </span>
        )}
      </div>

      {/* Todo List Content */}
      <div className="space-y-4 flex-1 flex flex-col justify-between">
        {/* List scroll container */}
        {todos.length === 0 ? (
          <div className={`flex flex-col items-center justify-center flex-1 py-8 text-center border border-dashed rounded-xl ${
            dark ? 'border-zinc-800 bg-zinc-950/20' : 'border-gray-200 bg-gray-50/20'
          }`}>
            <ClipboardList size={22} className={`${muted} mb-2 opacity-30`} />
            <p className={`text-[12px] font-medium ${dark ? 'text-zinc-400' : 'text-zinc-600'}`}>No tasks for today.</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Add one below to get started!</p>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin my-auto w-full">
            {todos.map((todo: any) => (
              <div
                key={todo.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  todo.isChecked
                    ? dark
                      ? 'bg-zinc-950/20 border-zinc-900 opacity-60'
                      : 'bg-gray-50/50 border-gray-150 opacity-60'
                    : dark
                      ? 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700/80'
                      : 'bg-white border-gray-200/80 hover:border-gray-300'
                }`}
              >
                <button
                  onClick={() => handleToggle(todo.id)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <div className={`shrink-0 transition-colors ${todo.isChecked ? 'text-green-500' : muted}`}>
                    {todo.isChecked ? (
                      <CheckSquare size={16} className="fill-green-500/10" />
                    ) : (
                      <Square size={16} />
                    )}
                  </div>
                  <span className={`text-[13px] leading-snug break-words pr-2 transition-all ${
                    todo.isChecked
                      ? 'line-through text-zinc-500'
                      : dark ? 'text-zinc-200' : 'text-zinc-800'
                  }`}>
                    {todo.text}
                  </span>
                </button>

                <button
                  onClick={() => handleDelete(todo.id)}
                  className={`p-1 rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-500 ${muted}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        <form onSubmit={handleAddTodo} className="flex gap-2 shrink-0">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            placeholder="Add a new task..."
            className={`flex-1 px-3 py-2 text-[13px] rounded-lg border outline-none transition-colors
              ${dark
                ? 'bg-zinc-950 border-zinc-800 text-zinc-200 placeholder-zinc-650 focus:border-zinc-700'
                : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-gray-300'
              }
            `}
          />
          <button
            type="submit"
            disabled={!newTodoText.trim()}
            className={`flex items-center justify-center p-2 rounded-lg border transition-all active:scale-95 shrink-0
              ${!newTodoText.trim()
                ? dark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed opacity-50'
                : dark
                  ? 'bg-white text-black border-white hover:bg-zinc-100'
                  : 'bg-black text-white border-black hover:bg-zinc-800'
              }
            `}
          >
            <Plus size={15} />
          </button>
        </form>
      </div>
    </section>
  );
}

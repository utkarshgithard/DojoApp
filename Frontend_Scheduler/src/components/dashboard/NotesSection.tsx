"use client";

import React, { useEffect, useState, useRef, useContext } from 'react';
import { useDarkMode } from '@/context/DarkModeContext';
import { AuthContext } from '@/context/authContext';
import { ClipboardList, Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import API from '@/lib/axios';

interface NotesSectionProps {
  date: string;
  cardClass: string;
  muted: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

const getStorageKey = (userId: string, targetDate: string) => `notes_checklist_${userId}_${targetDate}`;

/**
 * Self-contained daily checklist widget for the dashboard.
 * Optimized with Stale-While-Revalidate (SWR) cache & LocalStorage:
 * - Loads instantly from LocalStorage (0ms latency, no loading spinner).
 * - Revalidates against the database in the background to ensure consistency.
 * - Saves instantly to LocalStorage.
 * - Debounces backend API syncs to reduce server requests and prevent cancellations.
 * - Uses fetch + keepalive for reliable background saves on tab close/unload.
 */
export default function NotesSection({ date, cardClass, muted }: NotesSectionProps) {
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;

  // Access user details to scope the LocalStorage cache
  const authContext = useContext(AuthContext) as any;
  const userId = authContext?.userId || 'guest';

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // References to prevent closures, race conditions & overlapping requests
  const todosRef = useRef<TodoItem[]>([]);
  const saveStatusRef = useRef<SaveStatus>('idle');
  const saveDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeDateRef = useRef(date);

  // Sync references with state
  useEffect(() => {
    todosRef.current = todos;
  }, [todos]);

  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);



  // ── Unload/Tab Close Safeguard ─────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      // If there is a pending save, flush it using a keepalive request before closing
      if (saveDebounceTimerRef.current) {
        clearTimeout(saveDebounceTimerRef.current);
        saveDebounceTimerRef.current = null;

        const prevDate = activeDateRef.current;
        const todosToSave = todosRef.current;
        const serialized = JSON.stringify(todosToSave);

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const token = localStorage.getItem('token');

        fetch(`${backendUrl}/api/notes/${prevDate}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token || '',
          },
          body: JSON.stringify({ content: serialized }),
          keepalive: true, // Keep connection open even after tab closed
        }).catch((err) => console.error('[Notes] Page unload sync failed:', err));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userId]);

  // ── Parse/Load Note ────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Flush any pending save for the previous date immediately before switching
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
      saveDebounceTimerRef.current = null;
      
      const prevDate = activeDateRef.current;
      const todosToSave = todosRef.current;
      
      // Fire-and-forget save for the previous date
      (async () => {
        try {
          const serialized = JSON.stringify(todosToSave);
          await API.put(`/notes/${prevDate}`, { content: serialized });
        } catch (err) {
          console.error('[Notes] Background flush save failed:', err);
        }
      })();
    }

    // Update the ref to the new active date
    activeDateRef.current = date;

    let cancelled = false;
    
    // Check LocalStorage cache first for instant loading
    const storageKey = getStorageKey(userId, date);
    const cached = localStorage.getItem(storageKey);

    if (cached) {
      const parsed = parseNotesContent(cached);
      setTodos(parsed);
      todosRef.current = parsed;
    } else {
      // If not cached, reset to empty checklist immediately so we don't show the previous date's items while waiting
      setTodos([]);
      todosRef.current = [];
    }

    setSaveStatus('idle');

    // Revalidate with server in the background
    API.get(`/notes/${date}`)
      .then((res) => {
        if (!cancelled) {
          const rawContent = res.data.content ?? '';
          const dbTodos = parseNotesContent(rawContent);
          const serializedDb = JSON.stringify(dbTodos);

          // Update cache
          localStorage.setItem(storageKey, serializedDb);

          // Overwrite local state only if the user hasn't made unsaved changes in this session
          if (saveStatusRef.current === 'idle') {
            setTodos(dbTodos);
            todosRef.current = dbTodos;
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[Notes] Revalidation failed:', err.message);
          // If no cache and request failed, default to empty
          if (!cached) {
            setTodos([]);
            todosRef.current = [];
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [date, userId]);

  // Helper to safely parse JSON or convert legacy text (split by newlines)
  const parseNotesContent = (rawContent: string): TodoItem[] => {
    const trimmed = rawContent.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any, idx) => ({
          id: item.id || `task-${idx}-${Date.now()}`,
          text: typeof item.text === 'string' ? item.text : String(item),
          completed: !!item.completed,
        }));
      }
    } catch (e) {
      // Legacy text fallback: Split by newline if it's multiple lines
      const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
      return lines.map((line, idx) => ({
        id: `legacy-${idx}-${Date.now()}`,
        text: line,
        completed: false
      }));
    }
    return [{ id: `legacy-${Date.now()}`, text: trimmed, completed: false }];
  };

  // ── Save/Sync Actions ──────────────────────────────────────────────────────
  const syncToBackend = (updatedTodos: TodoItem[]) => {
    setSaveStatus('saving');
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
    }
    saveDebounceTimerRef.current = setTimeout(async () => {
      try {
        const serialized = JSON.stringify(updatedTodos);
        if (serialized.length > 10_000) {
          setSaveStatus('error');
          alert("Checklist is too large. Please remove some items.");
          return;
        }

        await API.put(`/notes/${date}`, { content: serialized });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
      } catch (err: any) {
        console.error('[Notes] Server sync failed:', err.message);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, 1200); // 1.2s debounce to accumulate rapid clicks/changes
  };

  const updateLocalState = (updated: TodoItem[]) => {
    setTodos(updated);
    todosRef.current = updated;
    // Save instantly to LocalStorage (local persistence)
    localStorage.setItem(getStorageKey(userId, date), JSON.stringify(updated));
    // Queue background save to Database
    syncToBackend(updated);
  };

  // ── Action Handlers ────────────────────────────────────────────────────────
  const addTodo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newTodoText.trim();
    if (!text) return;

    if (text.length > 200) {
      alert("Task name is too long (max 200 characters).");
      return;
    }

    const newTodo: TodoItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      text,
      completed: false,
    };

    const updated = [...todos, newTodo];
    setNewTodoText('');
    updateLocalState(updated);
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    updateLocalState(updated);
  };

  const deleteTodo = (id: string) => {
    const updated = todos.filter((t) => t.id !== id);
    updateLocalState(updated);
  };

  // ── Counters ───────────────────────────────────────────────────────────────
  const completedCount = todos.filter((t) => t.completed).length;
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
            {todos.map((todo) => (
              <div
                key={todo.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  todo.completed
                    ? dark
                      ? 'bg-zinc-950/20 border-zinc-900 opacity-60'
                      : 'bg-gray-50/50 border-gray-150 opacity-60'
                    : dark
                      ? 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700/80'
                      : 'bg-white border-gray-200/80 hover:border-gray-300'
                }`}
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <div className={`shrink-0 transition-colors ${todo.completed ? 'text-green-500' : muted}`}>
                    {todo.completed ? (
                      <CheckSquare size={16} className="fill-green-500/10" />
                    ) : (
                      <Square size={16} />
                    )}
                  </div>
                  <span className={`text-[13px] leading-snug break-words pr-2 transition-all ${
                    todo.completed
                      ? 'line-through text-zinc-500'
                      : dark ? 'text-zinc-200' : 'text-zinc-800'
                  }`}>
                    {todo.text}
                  </span>
                </button>

                <button
                  onClick={() => deleteTodo(todo.id)}
                  className={`p-1 rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-500 ${muted}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        <form onSubmit={addTodo} className="flex gap-2 shrink-0">
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

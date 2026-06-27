"use client";

import React, { useState, useRef, useEffect, useContext } from 'react';
import { Bot, X, Send, Loader2, MessageSquare, Maximize2, Minimize2, Mic } from 'lucide-react';
import { AuthContext } from '@/context/authContext';
import { useAttendance } from '@/context/AttendanceContext';
import { useCalendarContext } from '@/context/CalendarContext';
import { usePathname } from 'next/navigation';

export default function AiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const auth = useContext(AuthContext) as any;
  const attendance = useAttendance();
  const calendar = useCalendarContext();
  const pathname = usePathname();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: auth?.isAuthenticated 
          ? `Hi ${auth?.userName || 'there'}! I'm DojoBot. Ask me anything about your attendance, schedule, or study plans!`
          : "Hello! I'm DojoBot. Want to learn how DojoClass can help you manage your attendance and studies?"
      }]);
    }
  }, [isOpen, auth?.isAuthenticated, auth?.userName, messages.length]);

  // Clear chat history on logout
  useEffect(() => {
    if (!auth?.isAuthenticated && messages.length > 0) {
      setMessages([]);
    }
  }, [auth?.isAuthenticated]);

  const generateSystemContext = () => {
    if (!auth?.isAuthenticated) {
      return `The user is currently a guest browsing the DojoClass landing page (path: ${pathname}).
DojoClass is a modern, student-centric application designed to help students track their college attendance (to keep it above 75%), manage their study schedules using AI spaced-repetition, and collaborate with friends in community study sessions. 
It features a Dashboard for quick overviews, an Exam Prep module that generates AI study plans based on difficulty, a Session feature for real-time video study rooms, and a Community feature to share notes.
Your goal is to politely answer questions about these features, act as a helpful guide, and encourage them to Sign Up to experience the full app.`;
    }

    // Authenticated User Context
    let ctx = `The user is authenticated. Name: ${auth?.userName || 'Unknown'}.\nCurrent Path: ${pathname}\n\n`;

    // Attendance Data
    if (attendance?.subjectStats && attendance.subjectStats.length > 0) {
      ctx += `--- ATTENDANCE DATA ---\n`;
      let totalAttended = 0;
      let totalConducted = 0;
      attendance.subjectStats.forEach((s: any) => {
        totalAttended += s.totalAttended || 0;
        totalConducted += s.totalConducted || 0;
        const pct = s.totalConducted > 0 ? Math.round((s.totalAttended / s.totalConducted) * 100) : 100;
        ctx += `- ${s.subjectName}: ${s.totalAttended}/${s.totalConducted} classes (${pct}%)\n`;
      });
      const overall = totalConducted > 0 ? Math.round((totalAttended / totalConducted) * 100) : 100;
      ctx += `Overall Attendance: ${overall}%\n\n`;
    } else {
      ctx += `User has not added any subjects for attendance tracking yet.\n\n`;
    }

    // Calendar/Exam Prep Data
    if (calendar?.calendarData && Object.keys(calendar.calendarData).length > 0) {
      ctx += `--- ALL CALENDAR TASKS ---\n`;
      const pending: string[] = [];
      const completed: string[] = [];
      
      Object.entries(calendar.calendarData).forEach(([dateStr, dayData]: [string, any]) => {
        if (dayData.tasks && Array.isArray(dayData.tasks)) {
          dayData.tasks.forEach((t: any) => {
            const taskStr = `${t.text} (Date: ${dateStr}, Difficulty: ${t.difficulty}, TaskId: ${t.id})`;
            if (t.isChecked) completed.push(taskStr);
            else pending.push(taskStr);
          });
        }
      });

      if (pending.length > 0) {
        ctx += `PENDING TASKS:\n${pending.map(t => `- ${t}`).join('\n')}\n\n`;
      } else {
        ctx += `No pending tasks.\n\n`;
      }

      if (completed.length > 0) {
        ctx += `COMPLETED TASKS:\n${completed.map(t => `- ${t}`).join('\n')}\n\n`;
      } else {
        ctx += `No completed tasks yet.\n\n`;
      }
    }

    ctx += `\nYour role: Answer questions about their data, advise on attendance (e.g. if a subject is below 75%, warn them), and help them manage their time effectively.`;
    
    return ctx;
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          systemContext: generateSystemContext(),
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.functionCalls) {
          let confirmMessage = "";
          data.functionCalls.forEach((call: any) => {
            if (call.name === 'add_task') {
              calendar.addTask(call.args.date, call.args.text, call.args.difficulty);
              confirmMessage += `✅ Added task "${call.args.text}" for ${call.args.date}.\n`;
            } else if (call.name === 'delete_task') {
              calendar.deleteTask(call.args.date, call.args.taskId);
              confirmMessage += `🗑️ Deleted a task on ${call.args.date}.\n`;
            } else if (call.name === 'toggle_task') {
              calendar.toggleTask(call.args.date, call.args.taskId);
              confirmMessage += `🔄 Toggled a task on ${call.args.date}.\n`;
            }
          });
          setMessages(prev => [...prev, { role: 'assistant', content: confirmMessage || "Action completed successfully!" }]);
        } else if (data.text) {
          setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again later.' }]);
        console.error(data.error);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleMicrophoneClick = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? prev + ' ' + transcript : transcript);
      setIsListening(false);
    };
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  return (
    <div className="fixed bottom-6 left-6 md:left-auto md:right-6 z-[9999] flex flex-col items-start md:items-end">
      {/* Chat Popover */}
      {isOpen && (
        <div 
          className={`mb-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden flex flex-col transition-all duration-300 origin-bottom-left md:origin-bottom-right ${
            isExpanded ? 'w-[90vw] md:w-[600px] h-[80vh]' : 'w-[350px] h-[500px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-[14px]">DojoBot</h3>
                <p className="text-[11px] text-zinc-500">AI Study Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-zinc-500">
              <button onClick={() => setIsExpanded(!isExpanded)} className="hover:text-black dark:hover:text-white transition-colors">
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button onClick={() => setIsOpen(false)} className="hover:text-black dark:hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] ${
                    msg.role === 'user' 
                      ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-sm' 
                      : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 rounded-tl-sm'
                  }`}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {/* Basic markdown simulation since react-markdown isn't installed */}
                  {msg.content.split('\n').map((line, idx) => (
                    <span key={idx}>
                      {line.replace(/\*\*(.*?)\*\*/g, '$1')} 
                      <br/>
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-zinc-500">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-[12px]">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your attendance, tasks, or study plans..."
                className="w-full bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 text-[13px] rounded-full pl-4 pr-[84px] py-3 outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 transition-all"
                disabled={loading}
              />
              <div className="absolute right-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleMicrophoneClick}
                  disabled={loading}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-transparent text-zinc-500 hover:text-black dark:hover:text-white'
                  }`}
                  title="Voice input"
                >
                  <Mic size={16} />
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black disabled:opacity-50 transition-opacity"
                >
                  <Send size={14} className="ml-0.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${
          isOpen 
            ? 'bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white' 
            : 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-[16px] tracking-wider'
        }`}
      >
        {isOpen ? <X size={22} /> : <span className="select-none font-black">AI</span>}
      </button>
    </div>
  );
}

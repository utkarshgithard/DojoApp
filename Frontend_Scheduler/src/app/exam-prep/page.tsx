"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/authContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { useRouter } from "next/navigation";
import { BookOpen, Calendar, Clock, Link as LinkIcon, Plus, Trash2, Play, Square, Pause, Sparkles, AlertCircle } from "lucide-react";
import { useTimer } from "@/context/TimerContext";
import { useCalendarContext } from "@/context/CalendarContext";
import MasterCalendar from "@/components/MasterCalendar";
import { toast } from "sonner";
import { useExamPrep } from "@/context/ExamPrepContext";

export default function ExamPrepPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth() as any;
  const { darkMode } = useDarkMode() as any;

  const [mounted, setMounted] = useState(false);

  const { exams, courses, resources, addExam, deleteExam, addCourse, updateCourseProgress, deleteCourse, addResource, deleteResource } = useExamPrep();
  const [notes, setNotes] = useState("");

  // AI Revision Planner Wizard states
  const [wizardStep, setWizardStep] = useState(1); // Steps 1 to 5, Step 6 is Summary
  const [wizardTopicName, setWizardTopicName] = useState("");
  const [wizardDifficulty, setWizardDifficulty] = useState<'Easy'|'Medium'|'Hard'>("Medium");

  const todayString = new Date().toISOString().split('T')[0];
  const [examType, setExamType] = useState("IIT JEE");
  const [daysToComplete, setDaysToComplete] = useState(30);
  const [plannerHours, setPlannerHours] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plannerError, setPlannerError] = useState("");

  // Progressive reveal temporary states for 2-field forms
  const [tempDeadlineName, setTempDeadlineName] = useState("");
  const [tempCourseName, setTempCourseName] = useState("");
  const [tempResourceTitle, setTempResourceTitle] = useState("");

  // Autosave notes indicator state
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Global Calendar
  const { importAIPlan } = useCalendarContext();

  // Consume global timer context
  const {
    time, setTime, isRunning, setIsRunning, totalFocusTime,
    isCountdown, setIsCountdown, setInitialCountdownTime,
    isFloating, setIsFloating, stopTimer
  } = useTimer();

  // ── Ephemeral local state & Wizard Session Storage Persistence ────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedNotes = localStorage.getItem('examPrep_notes');
      if (storedNotes) setNotes(storedNotes);

      // Restore Wizard states from sessionStorage
      const storedStep = sessionStorage.getItem('examPrep_wizardStep');
      if (storedStep) setWizardStep(parseInt(storedStep) || 1);

      const storedTopic = sessionStorage.getItem('examPrep_wizardTopicName');
      if (storedTopic) setWizardTopicName(storedTopic);

      const storedDiff = sessionStorage.getItem('examPrep_wizardDifficulty');
      if (storedDiff) setWizardDifficulty((storedDiff as any) || "Medium");

      const storedExamType = localStorage.getItem('examPrep_examType');
      if (storedExamType) setExamType(storedExamType);

      const storedDaysToComplete = localStorage.getItem('examPrep_daysToComplete');
      if (storedDaysToComplete) setDaysToComplete(parseInt(storedDaysToComplete) || 30);

      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('examPrep_notes', notes);
      localStorage.setItem('examPrep_examType', examType);
      localStorage.setItem('examPrep_daysToComplete', daysToComplete.toString());

      // Persist Wizard states in sessionStorage
      sessionStorage.setItem('examPrep_wizardStep', wizardStep.toString());
      sessionStorage.setItem('examPrep_wizardTopicName', wizardTopicName);
      sessionStorage.setItem('examPrep_wizardDifficulty', wizardDifficulty);
    }
  }, [notes, wizardStep, wizardTopicName, wizardDifficulty, examType, daysToComplete, mounted]);

  // Auth check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);

  // Notes autosave simulation trigger
  useEffect(() => {
    if (!mounted) return;
    setIsSavingNotes(true);
    const timeout = setTimeout(() => setIsSavingNotes(false), 650);
    return () => clearTimeout(timeout);
  }, [notes]);

  if (!mounted || authLoading) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${darkMode ? "bg-black text-white" : "bg-white text-gray-900"}`}>
        <span className="inline-block w-6 h-6 rounded-full border-[2px] border-current border-t-transparent animate-spin" />
      </div>
    );
  }

  const dark = darkMode;
  const border = dark ? "border-zinc-800" : "border-zinc-200";
  const muted = dark ? "text-zinc-400" : "text-zinc-500";
  
  // Card styles (Primary elevated, Secondary flat)
  const primaryCardClass = `border-2 border-indigo-500/10 dark:border-indigo-500/20 rounded-2xl p-6 ${
    dark ? "bg-zinc-950/30" : "bg-white"
  } shadow-xl shadow-indigo-500/[0.02]`;

  const secondaryCardClass = `border rounded-2xl p-5 ${border} ${
    dark ? "bg-zinc-950/10" : "bg-white"
  } shadow-sm`;
  
  const inputClass = `w-full px-3.5 py-2 text-sm rounded-xl border outline-none transition-all duration-200 ${
    dark 
      ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20" 
      : "bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
  }`;
  
  const primaryBtn = `px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed`;
  const secondaryBtn = `px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border ${border} transition-all active:scale-[0.98] flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed`;
  const destructiveBtn = `px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed`;
  
  // 44x44px Touch Target Button
  const iconAddBtn = `w-11 h-11 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed`;

  // --- Handlers ---
  const handleAddExam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const date = formData.get('date') as string;
    if (!name || !date) return;
    form.reset();
    setTempDeadlineName(""); // Collapse form
    await addExam(name, date);
  };

  const handleAddCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const total = parseInt(formData.get('total') as string, 10);
    if (!name || total <= 0) return;
    form.reset();
    setTempCourseName(""); // Collapse form
    await addCourse(name, total);
  };

  const handleAddResource = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = formData.get('title') as string;
    const url = formData.get('url') as string;
    if (!title || !url) return;
    form.reset();
    setTempResourceTitle(""); // Collapse form
    await addResource(title, url);
  };

  const calculateDaysRemaining = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(dateString);
    const diffTime = examDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setPlannerError("");
    try {
      const calculatedExamDate = new Date();
      calculatedExamDate.setDate(calculatedExamDate.getDate() + daysToComplete);
      const calculatedExamDateString = calculatedExamDate.toISOString().split('T')[0];

      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          topics: [{ id: Date.now().toString(), name: wizardTopicName, difficulty: wizardDifficulty }], 
          examType,
          daysToComplete,
          examDate: calculatedExamDateString, 
          todayDate: todayString, 
          hours: plannerHours 
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate plan");
      }
      importAIPlan(data.plan);
      toast.success("AI tasks added to Master Calendar!");
      
      // Reset Wizard state on success
      setWizardStep(1);
      setWizardTopicName("");
      setWizardDifficulty("Medium");
    } catch (err: any) {
      setPlannerError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 pt-[96px] md:pt-[24px] pb-32 ${dark ? "bg-black text-white" : "bg-white text-zinc-900"}`}>
      <div className="max-w-[1100px] w-full mx-auto px-5">
        
        {/* Header */}
        <div className="mb-8 border-b pb-5 border-zinc-100 dark:border-zinc-900">
          <p className={`text-[11px] uppercase tracking-widest ${muted} mb-1 flex items-center gap-1.5`}>
            <BookOpen size={12} />
            <span>Preparation Center</span>
          </p>
          <h1 className="text-[22px] font-semibold tracking-tight">Exam Preparation</h1>
          <p className={`text-[13px] ${muted} mt-0.5`}>Track deadlines, course progress, focus sessions, and reference notes. Synced across all your devices.</p>
        </div>

        {/* Desktop 2-Column Balanced Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Column 1: Focus, AI Planner & Deadlines */}
          <div className="space-y-8">
            
            {/* Focus Session Card */}
            <section className={primaryCardClass}>
              <h2 className="text-[15px] font-semibold tracking-tight mb-5 flex items-center gap-2">
                <Clock size={16} className="text-indigo-500" /> Focus Session
              </h2>
              
              {!isFloating ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch mb-5">
                  
                  {/* Left: Active Timer */}
                  <div 
                    onDoubleClick={() => setIsFloating(true)}
                    className={`md:col-span-7 flex flex-col items-center justify-center py-6 px-4 rounded-xl border ${border} ${dark ? 'bg-zinc-900/30 hover:bg-zinc-900/50' : 'bg-zinc-50 hover:bg-zinc-100'} transition-all cursor-pointer select-none group relative`}
                  >
                    <div className={`absolute top-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity ${muted} text-[10px]`}>
                      Double click to float
                    </div>
                    
                    <div className="text-[44px] font-light tracking-wider mb-5 font-mono">
                      {formatTime(time)}
                    </div>
                    
                    <div className="flex gap-3">
                      {!isRunning ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setIsRunning(true); }} 
                          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-semibold transition-all active:scale-95"
                        >
                          <Play size={14} fill="currentColor" /> {time > 0 ? "Resume" : "Start"}
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setIsRunning(false); }} 
                          className="flex items-center gap-2 px-5 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-full text-xs font-semibold transition-all active:scale-95"
                        >
                          <Pause size={14} fill="currentColor" /> Pause
                        </button>
                      )}
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); stopTimer(); }} 
                        disabled={time === 0 && !isRunning}
                        className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all ${
                          time === 0 && !isRunning 
                            ? 'bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed' 
                            : 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'
                        }`}
                      >
                        <Square size={14} fill="currentColor" /> Stop & Log
                      </button>
                    </div>
                  </div>

                  {/* Right: Today's Progress Panel */}
                  <div className={`md:col-span-5 flex flex-col justify-between p-4 rounded-xl border border-indigo-500/10 ${dark ? 'bg-indigo-950/10' : 'bg-indigo-50/30'}`}>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Today's Progress</span>
                      <h3 className="text-2xl font-bold font-mono mt-1 text-zinc-800 dark:text-zinc-100">
                        {formatTime(totalFocusTime)}
                      </h3>
                      <p className={`text-[11px] ${muted} mt-0.5`}>Total focused study time logged today.</p>
                    </div>
                    
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className={muted}>Daily Goal (2h)</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{Math.min(100, Math.round((totalFocusTime / 7200) * 100))}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.round((totalFocusTime / 7200) * 100))}%` }} 
                        />
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className={`flex flex-col items-center justify-center py-8 w-full rounded-xl ${dark ? 'bg-zinc-900/30' : 'bg-zinc-50/50'} border border-dashed ${border} mb-5`}>
                  <p className={`text-sm ${muted} mb-2`}>Timer is floating</p>
                  <button onClick={() => setIsFloating(false)} className="text-xs px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    Dock Timer
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 w-full">
                <h3 className={`text-[12px] font-medium mb-2 ${muted}`}>Start a Countdown Timer</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const mins = parseInt(formData.get("mins") as string, 10);
                  if (mins > 0) {
                    const secs = mins * 60;
                    setTime(secs);
                    setInitialCountdownTime(secs);
                    setIsCountdown(true);
                    setIsRunning(true);
                  }
                  e.currentTarget.reset();
                }} className="flex gap-2">
                  <input name="mins" type="number" min="1" placeholder="Enter target minutes..." disabled={isRunning || time > 0} required className={`${inputClass} flex-1 disabled:opacity-50 disabled:cursor-not-allowed`} />
                  <button type="submit" disabled={isRunning || time > 0} className={`${primaryBtn} disabled:opacity-50 disabled:cursor-not-allowed h-10`}>
                    <Play size={15} /> <span>Start</span>
                  </button>
                </form>
              </div>
            </section>

            {/* AI Revision Planner Card (Step-by-Step Wizard) */}
            <section className={primaryCardClass}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold tracking-tight flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-500 animate-pulse" /> AI Revision Planner
                </h2>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full">
                  {wizardStep <= 5 ? `Step ${wizardStep} of 5` : "Summary"}
                </span>
              </div>
              
              {/* Progress Bar for Wizard */}
              <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-6">
                <div 
                  className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-300" 
                  style={{ width: `${(Math.min(5, wizardStep) / 5) * 100}%` }} 
                />
              </div>

              <div className="min-h-[150px] flex flex-col justify-between">
                
                {/* Step Contents */}
                <div className="space-y-4">
                  {wizardStep === 1 && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 block">
                        What topic do you want to revise?
                      </label>
                      <input 
                        type="text"
                        autoFocus
                        placeholder="e.g. Quantum Physics, Integration..."
                        value={wizardTopicName}
                        onChange={(e) => setWizardTopicName(e.target.value)}
                        className={inputClass}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && wizardTopicName.trim()) {
                            setWizardStep(2);
                          }
                        }}
                      />
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 block">
                        How difficult is this topic for you?
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['Easy', 'Medium', 'Hard'] as const).map((diff) => (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => setWizardDifficulty(diff)}
                            className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all ${
                              wizardDifficulty === diff
                                ? 'bg-indigo-600 border-transparent text-white shadow-md shadow-indigo-500/10'
                                : dark
                                  ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                                  : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                            }`}
                          >
                            {diff === 'Easy' ? 'Easy 😊' : diff === 'Medium' ? 'Medium 😐' : 'Hard 😰'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {wizardStep === 3 && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 block">
                        Which exam are you preparing for?
                      </label>
                      <select 
                        value={examType} 
                        onChange={(e) => setExamType(e.target.value)} 
                        className={inputClass}
                        autoFocus
                      >
                        <option value="IIT JEE">IIT JEE (Main & Advanced)</option>
                        <option value="NEET">NEET (Medical Entrance)</option>
                        <option value="GATE">GATE (Engineering)</option>
                        <option value="UPSC">UPSC Civil Services (IAS/IPS)</option>
                        <option value="SSC">SSC CGL</option>
                        <option value="CAT">CAT (MBA Entrance)</option>
                        <option value="CUET">CUET (University Entrance)</option>
                        <option value="NDA">NDA (Defense Services)</option>
                        <option value="CLAT">CLAT (Law Entrance)</option>
                        <option value="Bank PO">Bank PO / IBPS / SBI</option>
                        <option value="Class 10 Board">Class 10 Board Exam</option>
                        <option value="Class 12 Board">Class 12 Board Exam</option>
                      </select>
                    </div>
                  )}

                  {wizardStep === 4 && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 block">
                        How many days do you have?
                      </label>
                      <input 
                        type="number" 
                        min="1" 
                        autoFocus
                        value={daysToComplete} 
                        onChange={(e) => setDaysToComplete(parseInt(e.target.value) || 1)} 
                        className={inputClass} 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setWizardStep(5);
                          }
                        }}
                      />
                    </div>
                  )}

                  {wizardStep === 5 && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 block">
                        How many hours per day can you study?
                      </label>
                      <input 
                        type="number" 
                        min="1" 
                        autoFocus
                        value={plannerHours} 
                        onChange={(e) => setPlannerHours(parseInt(e.target.value) || 1)} 
                        className={inputClass} 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setWizardStep(6);
                          }
                        }}
                      />
                    </div>
                  )}

                  {wizardStep === 6 && (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 block">
                        Review & Generate Your AI Revision Plan
                      </label>
                      <div className={`p-4 rounded-xl border ${border} bg-zinc-50/50 dark:bg-zinc-900/20 space-y-2.5 text-xs`}>
                        <div className="flex justify-between">
                          <span className={muted}>Topic to Revise:</span>
                          <span className="font-semibold">{wizardTopicName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={muted}>Difficulty:</span>
                          <span className="font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{wizardDifficulty}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={muted}>Target Exam:</span>
                          <span className="font-semibold">{examType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={muted}>Timeline:</span>
                          <span className="font-semibold">{daysToComplete} Days @ {plannerHours} hrs/day</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Wizard Controls */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                  {wizardStep > 1 && (
                    <button 
                      type="button"
                      onClick={() => setWizardStep(wizardStep - 1)}
                      className={secondaryBtn}
                      style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem' }}
                    >
                      Back
                    </button>
                  )}
                  
                  {wizardStep < 6 ? (
                    <button 
                      type="button"
                      disabled={wizardStep === 1 && !wizardTopicName.trim()}
                      onClick={() => setWizardStep(wizardStep + 1)}
                      className={`${primaryBtn} flex-1`}
                    >
                      Next
                    </button>
                  ) : (
                    <button 
                      onClick={handleGeneratePlan} 
                      disabled={isGenerating}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                        isGenerating 
                          ? 'bg-indigo-500/50 cursor-not-allowed text-white' 
                          : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 active:scale-[0.98] text-white shadow-lg shadow-indigo-500/10'
                      }`}
                    >
                      {isGenerating ? (
                        <><span className="inline-block w-4 h-4 rounded-full border-[2px] border-white/30 border-t-white animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles size={15} /> Generate & Add to Calendar</>
                      )}
                    </button>
                  )}
                </div>

                {plannerError && (
                  <div className="flex items-start gap-2 text-rose-500 text-[12px] bg-rose-500/10 p-3 rounded-xl mt-3">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <p>{plannerError}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Target Deadlines Card (with Progressive Reveal) */}
            <section className={secondaryCardClass}>
              <h2 className="text-[15px] font-semibold tracking-tight mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-zinc-400" /> Target Deadlines
              </h2>
              <form onSubmit={handleAddExam} className="flex flex-col gap-3 mb-4">
                <input 
                  name="name" 
                  type="text" 
                  placeholder="Enter upcoming exam name..." 
                  required 
                  value={tempDeadlineName}
                  onChange={(e) => setTempDeadlineName(e.target.value)}
                  className={inputClass} 
                />
                
                {/* Second field slides/fades in smoothly only when first field is filled */}
                <div className={`grid grid-cols-12 gap-2 transition-all duration-300 origin-top ${
                  tempDeadlineName.trim() 
                    ? "max-h-16 opacity-100 scale-y-100 translate-y-0" 
                    : "max-h-0 opacity-0 scale-y-95 -translate-y-2 overflow-hidden pointer-events-none"
                }`}>
                  <div className="col-span-8">
                    <input name="date" type="date" required className={inputClass} />
                  </div>
                  <div className="col-span-4">
                    <button type="submit" className={`${iconAddBtn} w-full`} title="Add Deadline">
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </form>
              
              <div className="space-y-3">
                {exams.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 px-4 border border-dashed rounded-xl border-zinc-200 dark:border-zinc-800 text-center">
                    <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-455 mb-2">
                      <Calendar size={16} />
                    </div>
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No exams added yet</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 max-w-[200px]">Add your upcoming exam deadlines above to track the days remaining.</p>
                  </div>
                ) : (
                  exams.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(exam => {
                    const days = calculateDaysRemaining(exam.date);
                    return (
                      <div key={exam.id} className={`flex items-center justify-between p-3 rounded-xl border ${border} ${dark ? 'bg-zinc-900/10' : 'bg-zinc-50/50'}`}>
                        <div>
                          <p className="font-medium text-[13.5px]">{exam.name}</p>
                          <p className={`text-[11px] ${muted}`}>{exam.date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className={`text-[16px] font-bold ${days < 7 ? 'text-rose-500' : days < 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {days < 0 ? 'Passed' : days}
                            </span>
                            {days >= 0 && <p className={`text-[9px] uppercase tracking-wider ${muted}`}>Days Left</p>}
                          </div>
                          <button onClick={() => deleteExam(exam.id)} className="text-zinc-400 hover:text-rose-500 p-1.5 rounded-md transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

          </div>

          {/* Column 2: Courses & Central Resource Hub */}
          <div className="space-y-8">
            
            {/* Course Planner Card (with Progressive Reveal) */}
            <section className={secondaryCardClass}>
              <h2 className="text-[15px] font-semibold tracking-tight mb-4 flex items-center gap-2">
                <BookOpen size={16} className="text-zinc-400" /> Course Planner
              </h2>
              <form onSubmit={handleAddCourse} className="flex flex-col gap-3 mb-4">
                <input 
                  name="name" 
                  type="text" 
                  placeholder="Enter course name..." 
                  required 
                  value={tempCourseName}
                  onChange={(e) => setTempCourseName(e.target.value)}
                  className={inputClass} 
                />
                
                {/* Second field slides/fades in smoothly only when first field is filled */}
                <div className={`grid grid-cols-12 gap-2 transition-all duration-300 origin-top ${
                  tempCourseName.trim() 
                    ? "max-h-16 opacity-100 scale-y-100 translate-y-0" 
                    : "max-h-0 opacity-0 scale-y-95 -translate-y-2 overflow-hidden pointer-events-none"
                }`}>
                  <div className="col-span-8">
                    <input name="total" type="number" min="1" placeholder="Total lectures..." required className={inputClass} />
                  </div>
                  <div className="col-span-4">
                    <button type="submit" className={`${iconAddBtn} w-full`} title="Add Course">
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </form>
              
              <div className="space-y-4">
                {courses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 px-4 border border-dashed rounded-xl border-zinc-200 dark:border-zinc-800 text-center">
                    <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-455 mb-2">
                      <BookOpen size={16} />
                    </div>
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No courses tracked yet</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 max-w-[200px]">Create a course above to monitor your lecture-by-lecture syllabus progress.</p>
                  </div>
                ) : (
                  courses.map(course => {
                    const progress = Math.round((course.completedLectures / course.totalLectures) * 100);
                    return (
                      <div key={course.id} className={`p-3.5 rounded-xl border ${border} space-y-3`}>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-[14px]">{course.name}</p>
                          <button onClick={() => deleteCourse(course.id)} className="text-zinc-400 hover:text-rose-500 p-1 rounded-md transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-medium">
                            <span className={muted}>Lectures: {course.completedLectures} / {course.totalLectures}</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{progress}%</span>
                          </div>
                          {/* Visible Progress Bar */}
                          <div className="w-full h-1.5 bg-zinc-105 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-300" 
                              style={{ width: `${progress}%` }} 
                            />
                          </div>
                        </div>
                        
                        {/* Numbered Lecture Grid */}
                        <div className="flex flex-wrap gap-1.5 mt-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                          {Array.from({ length: course.totalLectures }).map((_, i) => {
                            const isCompleted = i < course.completedLectures;
                            const isCurrent = i === course.completedLectures;
                            
                            return (
                              <div 
                                key={i} 
                                onClick={() => {
                                  const newCompleted = i < course.completedLectures ? i : i + 1;
                                  updateCourseProgress(course.id, newCompleted);
                                }}
                                className={`w-9 h-9 rounded-lg border flex items-center justify-center text-[12px] font-bold cursor-pointer transition-all duration-200 hover:scale-105 shrink-0 ${
                                  isCompleted 
                                    ? 'bg-indigo-600 text-white border-transparent shadow-[0_0_8px_rgba(79,70,229,0.3)]' 
                                    : isCurrent
                                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                                      : dark 
                                        ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800' 
                                        : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:bg-zinc-100'
                                }`} 
                                title={
                                  isCompleted 
                                    ? `Lecture ${i + 1} (Completed)` 
                                    : isCurrent 
                                      ? `Lecture ${i + 1} (Up Next)` 
                                      : `Lecture ${i + 1} (Locked)`
                                }
                              >
                                {i + 1}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Quick Increment buttons */}
                        <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                          <button 
                            onClick={() => {
                              const newCompleted = Math.max(0, course.completedLectures - 1);
                              updateCourseProgress(course.id, newCompleted);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${border} ${dark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300' : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700'} transition-all`}
                          >
                            -1 Lecture
                          </button>
                          <button 
                            onClick={() => {
                              const newCompleted = Math.min(course.totalLectures, course.completedLectures + 1);
                              updateCourseProgress(course.id, newCompleted);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${border} ${dark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300' : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700'} transition-all`}
                          >
                            +1 Lecture
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Central Resource Hub & Reference Notes (with Progressive Reveal) */}
            <section className={secondaryCardClass}>
              <h2 className="text-[15px] font-semibold tracking-tight mb-4 flex items-center gap-2">
                <LinkIcon size={16} className="text-zinc-400" /> Central Resource Hub
              </h2>
              
              <div className="space-y-5">
                <div>
                  <h3 className={`text-[12.5px] font-semibold mb-3 ${muted}`}>Quick Links</h3>
                  <form onSubmit={handleAddResource} className="flex flex-col gap-3 mb-3">
                    <input 
                      name="title" 
                      type="text" 
                      placeholder="Enter resource label (e.g. Syllabus PDF)..." 
                      required 
                      value={tempResourceTitle}
                      onChange={(e) => setTempResourceTitle(e.target.value)}
                      className={inputClass} 
                    />
                    
                    {/* Second field slides/fades in smoothly only when first field is filled */}
                    <div className={`grid grid-cols-12 gap-2 transition-all duration-300 origin-top ${
                      tempResourceTitle.trim() 
                        ? "max-h-16 opacity-100 scale-y-100 translate-y-0" 
                        : "max-h-0 opacity-0 scale-y-95 -translate-y-2 overflow-hidden pointer-events-none"
                    }`}>
                      <div className="col-span-8">
                        <input name="url" type="url" placeholder="Paste URL link..." required className={inputClass} />
                      </div>
                      <div className="col-span-4">
                        <button type="submit" className={`${iconAddBtn} w-full`} title="Add Link">
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>
                  </form>
                  
                  <div className="space-y-2">
                    {resources.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 px-4 border border-dashed rounded-xl border-zinc-200 dark:border-zinc-800 text-center">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 mb-2">
                          <LinkIcon size={14} />
                        </div>
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No resources linked yet</p>
                      </div>
                    ) : (
                      resources.map(resource => (
                        <div key={resource.id} className={`flex items-center justify-between p-2.5 rounded-xl border ${border} ${dark ? 'bg-zinc-900/20 hover:bg-zinc-900/50' : 'bg-zinc-50/40 hover:bg-zinc-50'} transition-all`}>
                          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate mr-4">
                            {resource.title}
                          </a>
                          <button onClick={() => deleteResource(resource.id)} className="text-zinc-400 hover:text-rose-500 p-1.5 rounded-md transition-colors shrink-0">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Reference Notes & Autosave indicator */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900">
                  <div className="flex justify-between items-center mb-2.5">
                    <h3 className={`text-[12.5px] font-semibold ${muted}`}>Reference Notes</h3>
                    <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                      {isSavingNotes ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Autosaved
                        </>
                      )}
                    </span>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Jot down quick formulas, exam topics, or reminders here..."
                    className={`${inputClass} min-h-[140px] resize-y text-sm`}
                  />
                </div>
              </div>
            </section>

          </div>

        </div>

        {/* Full Size Master Calendar at the bottom */}
        <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-900">
          <h2 className="text-[17px] font-semibold tracking-tight mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-indigo-500" /> Your Revision Schedule
          </h2>
          <div className={`p-4 border ${border} rounded-2xl ${dark ? 'bg-zinc-950/20' : 'bg-white'} shadow-sm`}>
            <MasterCalendar fullView />
          </div>
        </div>

      </div>
    </div>
  );
}

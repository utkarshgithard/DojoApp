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

interface Exam {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
}

interface Course {
  id: string;
  name: string;
  totalLectures: number;
  completedLectures: number;
}

interface Resource {
  id: string;
  title: string;
  url: string;
}

export default function ExamPrepPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth() as any;
  const { darkMode } = useDarkMode() as any;

  const [mounted, setMounted] = useState(false);

  // Data states
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [notes, setNotes] = useState("");

  // Revision Planner states
  // Revision Planner states
  const [plannerTopics, setPlannerTopics] = useState<{id: string, name: string, difficulty: 'Easy'|'Medium'|'Hard'}[]>([]);
  const todayString = new Date().toISOString().split('T')[0];
  const [examType, setExamType] = useState("IIT JEE");
  const [daysToComplete, setDaysToComplete] = useState(30);
  const [plannerHours, setPlannerHours] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plannerError, setPlannerError] = useState("");

  // Global Calendar
  const { importAIPlan } = useCalendarContext();

  // Consume global timer context
  const {
    time, setTime, isRunning, setIsRunning, totalFocusTime,
    isCountdown, setIsCountdown, setInitialCountdownTime,
    isFloating, setIsFloating, stopTimer
  } = useTimer();

  // Load from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedExams = localStorage.getItem("examPrep_exams");
      if (storedExams) setExams(JSON.parse(storedExams));

      const storedCourses = localStorage.getItem("examPrep_courses");
      if (storedCourses) setCourses(JSON.parse(storedCourses));

      const storedResources = localStorage.getItem("examPrep_resources");
      if (storedResources) setResources(JSON.parse(storedResources));

      const storedNotes = localStorage.getItem("examPrep_notes");
      if (storedNotes) setNotes(storedNotes);

      const storedPlannerTopics = localStorage.getItem("examPrep_plannerTopics");
      if (storedPlannerTopics) {
        const parsed = JSON.parse(storedPlannerTopics);
        setPlannerTopics(parsed.map((t: any) => ({ ...t, difficulty: t.difficulty === 'Okay' ? 'Medium' : t.difficulty })));
      }

      const storedExamType = localStorage.getItem("examPrep_examType");
      if (storedExamType) setExamType(storedExamType);

      const storedDaysToComplete = localStorage.getItem("examPrep_daysToComplete");
      if (storedDaysToComplete) setDaysToComplete(parseInt(storedDaysToComplete) || 30);

      setMounted(true);
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("examPrep_exams", JSON.stringify(exams));
      localStorage.setItem("examPrep_courses", JSON.stringify(courses));
      localStorage.setItem("examPrep_resources", JSON.stringify(resources));
      localStorage.setItem("examPrep_notes", notes);
      localStorage.setItem("examPrep_plannerTopics", JSON.stringify(plannerTopics));
      localStorage.setItem("examPrep_examType", examType);
      localStorage.setItem("examPrep_daysToComplete", daysToComplete.toString());
    }
  }, [exams, courses, resources, notes, plannerTopics, mounted]);

  // Auth check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);



  if (!mounted || authLoading) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${darkMode ? "bg-black text-white" : "bg-white text-gray-900"}`}>
        <span className="inline-block w-6 h-6 rounded-full border-[2px] border-current border-t-transparent animate-spin" />
      </div>
    );
  }

  const dark = darkMode;
  const border = dark ? "border-gray-800" : "border-gray-200";
  const muted = dark ? "text-gray-400" : "text-gray-500";
  const cardClass = `border rounded-xl p-5 ${border} ${dark ? "bg-black" : "bg-white"}`;
  
  const inputClass = `w-full px-3.5 py-2 text-sm rounded-lg border outline-none transition-colors ${
    dark ? "bg-black border-gray-800 text-white placeholder-gray-700 focus:border-gray-600" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400"
  }`;
  
  const primaryBtn = `px-3.5 py-2 rounded-lg text-[13px] font-medium transition-opacity hover:opacity-80 active:scale-95 flex items-center justify-center shrink-0 ${
    dark ? "bg-white text-black" : "bg-black text-white"
  }`;

  // --- Handlers ---
  const handleAddExam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const date = formData.get("date") as string;
    if (name && date) {
      setExams([...exams, { id: Date.now().toString(), name, date }]);
      e.currentTarget.reset();
    }
  };

  const handleAddCourse = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const total = parseInt(formData.get("total") as string, 10);
    if (name && total > 0) {
      setCourses([...courses, { id: Date.now().toString(), name, totalLectures: total, completedLectures: 0 }]);
      e.currentTarget.reset();
    }
  };

  const handleAddResource = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const url = formData.get("url") as string;
    if (title && url) {
      setResources([...resources, { id: Date.now().toString(), title, url }]);
      e.currentTarget.reset();
    }
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
          topics: plannerTopics, 
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
    <div className={`min-h-screen transition-colors duration-300 pt-[96px] md:pt-[24px] pb-32 ${dark ? "bg-black text-white" : "bg-white text-gray-900"}`}>
      <div className="max-w-[1100px] w-full mx-auto px-5">
        
        {/* Header */}
        <div className="mb-8 border-b pb-5 border-gray-100 dark:border-gray-900">
          <p className={`text-[11px] uppercase tracking-widest ${muted} mb-1 flex items-center gap-1.5`}>
            <BookOpen size={12} />
            <span>Preparation</span>
          </p>
          <h1 className="text-[22px] font-medium tracking-tight">Exam Preparation</h1>
          <p className={`text-[13px] ${muted} mt-0.5`}>Track deadlines, course progress, focus time, and essential resources. Data is saved locally to your device.</p>
        </div>

        <div className="flex flex-col gap-6">
          
          {/* Column 1 */}
          <div className="space-y-6">
            {/* 3. Focus Session Linker */}
            <section className={cardClass}>
              <h2 className="text-[15px] font-semibold tracking-tight mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2"><Clock size={16} /> Focus Session</span>
                <span className={`text-[12px] font-normal ${muted}`}>Total logged: {formatTime(totalFocusTime)}</span>
              </h2>
              
              {!isFloating ? (
                <div 
                  onDoubleClick={() => setIsFloating(true)}
                  className="flex flex-col items-center py-6 w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-xl transition-colors select-none group relative"
                >
                  <div className={`absolute top-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity ${muted} text-[10px] flex items-center gap-1`}>
                    Double tap to float
                  </div>
                  
                  <div className="text-[48px] font-light tracking-wider mb-6 font-mono pointer-events-none">
                    {formatTime(time)}
                  </div>
                  
                  <div className="flex gap-4">
                    {!isRunning ? (
                      <button onClick={(e) => { e.stopPropagation(); setIsRunning(true); }} className="flex items-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-full font-medium transition-all active:scale-95">
                        <Play size={16} fill="currentColor" /> {time > 0 ? "Resume" : "Start Stopwatch"}
                      </button>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setIsRunning(false); }} className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-medium transition-all active:scale-95">
                        <Pause size={16} fill="currentColor" /> Pause
                      </button>
                    )}
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); stopTimer(); }} 
                      disabled={time === 0 && !isRunning}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all ${
                        time === 0 && !isRunning ? 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white active:scale-95'
                      }`}
                    >
                      <Square size={16} fill="currentColor" /> Stop & Log
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`flex flex-col items-center justify-center py-10 w-full rounded-xl ${dark ? 'bg-gray-900/30' : 'bg-gray-50/50'} border border-dashed ${border}`}>
                  <p className={`text-sm ${muted} mb-2`}>Timer is floating</p>
                  <button onClick={() => setIsFloating(false)} className={`text-xs px-3 py-1.5 rounded-full border ${border} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}>
                    Dock Timer
                  </button>
                </div>
              )}

              <div className="pt-5 border-t border-gray-100 dark:border-gray-800 w-full">
                <h3 className={`text-[13px] font-medium mb-3 ${muted}`}>Start a Countdown Timer</h3>
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
                  <input name="mins" type="number" min="1" placeholder="Target Minutes" disabled={isRunning || time > 0} required className={`${inputClass} flex-1 disabled:opacity-50 disabled:cursor-not-allowed`} />
                  <button type="submit" disabled={isRunning || time > 0} className={`${primaryBtn} disabled:opacity-50 disabled:cursor-not-allowed`}>
                    <Play size={16} /> <span className="ml-1">Start Countdown</span>
                  </button>
                </form>
              </div>
            </section>

            {/* 1. Target Deadlines */}
            <section className={cardClass}>
              <h2 className="text-[15px] font-semibold tracking-tight mb-4 flex items-center gap-2">
                <Calendar size={16} /> Target Deadlines
              </h2>
              <form onSubmit={handleAddExam} className="flex gap-2 mb-4">
                <input name="name" type="text" placeholder="Exam Name" required className={`${inputClass} flex-1`} />
                <input name="date" type="date" required className={inputClass} style={{ width: '140px' }} />
                <button type="submit" className={primaryBtn}>
                  <Plus size={16} />
                </button>
              </form>
              
              <div className="space-y-3">
                {exams.length === 0 ? (
                  <p className={`text-[13px] ${muted} italic`}>No exams added.</p>
                ) : (
                  exams.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(exam => {
                    const days = calculateDaysRemaining(exam.date);
                    return (
                      <div key={exam.id} className={`flex items-center justify-between p-3 rounded-lg border ${border} ${dark ? 'bg-gray-900/30' : 'bg-gray-50'}`}>
                        <div>
                          <p className="font-medium text-[14px]">{exam.name}</p>
                          <p className={`text-[12px] ${muted}`}>{exam.date}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className={`text-[18px] font-bold ${days < 7 ? 'text-red-500' : days < 30 ? 'text-amber-500' : 'text-green-500'}`}>
                              {days < 0 ? 'Passed' : days}
                            </span>
                            {days >= 0 && <p className={`text-[10px] uppercase tracking-wider ${muted}`}>Days Left</p>}
                          </div>
                          <button onClick={() => setExams(exams.filter(e => e.id !== exam.id))} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-md transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* 2. Course Planner */}
            <section className={cardClass}>
              <h2 className="text-[15px] font-semibold tracking-tight mb-4 flex items-center gap-2">
                <BookOpen size={16} /> Course Planner
              </h2>
              <form onSubmit={handleAddCourse} className="flex gap-2 mb-4">
                <input name="name" type="text" placeholder="Course Name" required className={`${inputClass} flex-1`} />
                <input name="total" type="number" min="1" placeholder="Lectures" required className={inputClass} style={{ width: '100px' }} />
                <button type="submit" className={primaryBtn}>
                  <Plus size={16} />
                </button>
              </form>
              
              <div className="space-y-4">
                {courses.length === 0 ? (
                  <p className={`text-[13px] ${muted} italic`}>No courses added.</p>
                ) : (
                  courses.map(course => {
                    const progress = Math.round((course.completedLectures / course.totalLectures) * 100);
                    return (
                      <div key={course.id} className={`p-3 rounded-lg border ${border} space-y-2`}>
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-[14px]">{course.name}</p>
                          <button onClick={() => setCourses(courses.filter(c => c.id !== course.id))} className="text-red-500 hover:bg-red-500/10 p-1 rounded-md transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between text-[12px]">
                          <span className={muted}>Lectures: {course.completedLectures} / {course.totalLectures}</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                          {Array.from({ length: course.totalLectures }).map((_, i) => (
                            <div 
                              key={i} 
                              onClick={() => {
                                setCourses(courses.map(c => 
                                  c.id === course.id ? { ...c, completedLectures: i === c.completedLectures - 1 ? i : i + 1 } : c
                                ))
                              }}
                              className={`w-8 h-8 rounded-md border flex items-center justify-center text-[11.5px] font-bold cursor-pointer transition-all duration-200 hover:scale-105 shrink-0 ${
                                i < course.completedLectures 
                                  ? 'bg-indigo-500 text-white border-transparent shadow-[0_0_8px_rgba(99,102,241,0.4)]' 
                                  : dark ? 'bg-gray-800 border-gray-800 text-gray-500 hover:bg-gray-700 hover:border-gray-700' : 'bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                              }`} 
                              title={`Lecture ${i + 1}`}
                            >
                              {i + 1}
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-2 pt-1">
                          <button 
                            onClick={() => setCourses(courses.map(c => c.id === course.id ? { ...c, completedLectures: Math.max(0, c.completedLectures - 1) } : c))}
                            className={`px-2 py-1 rounded text-[11px] font-medium border ${border} ${dark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                          >
                            -1
                          </button>
                          <button 
                            onClick={() => setCourses(courses.map(c => c.id === course.id ? { ...c, completedLectures: Math.min(c.totalLectures, c.completedLectures + 1) } : c))}
                            className={`px-2 py-1 rounded text-[11px] font-medium border ${border} ${dark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                          >
                            +1
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* AI Revision Planner */}
            <section className={cardClass}>
              <h2 className="text-[15px] font-semibold tracking-tight mb-4 flex items-center gap-2">
                <Sparkles size={16} className="text-purple-500" /> AI Revision Planner
              </h2>
              
              <div className="space-y-4">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const name = formData.get("name") as string;
                  const difficulty = formData.get("difficulty") as 'Easy'|'Medium'|'Hard';
                  if (name && difficulty) {
                    setPlannerTopics([...plannerTopics, { id: Date.now().toString(), name, difficulty }]);
                    e.currentTarget.reset();
                  }
                }} className="flex gap-2">
                  <input name="name" type="text" placeholder="Topic Name" required className={`${inputClass} flex-1`} />
                  <select name="difficulty" required className={inputClass} style={{ width: '100px' }}>
                    <option value="Easy">Easy 😊</option>
                    <option value="Medium">Medium 😐</option>
                    <option value="Hard">Hard 😰</option>
                  </select>
                  <button type="submit" className={primaryBtn}>
                    <Plus size={16} />
                  </button>
                </form>

                {plannerTopics.length > 0 && (
                  <div className={`p-3 rounded-lg border ${border} space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar`}>
                    {plannerTopics.map(topic => (
                      <div key={topic.id} className="flex items-center justify-between text-[13px]">
                        <span>{topic.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                            topic.difficulty === 'Hard' ? 'bg-red-500/10 text-red-500' :
                            topic.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500' :
                            'bg-green-500/10 text-green-500'
                          }`}>
                            {topic.difficulty}
                          </span>
                          <button onClick={() => setPlannerTopics(plannerTopics.filter(t => t.id !== topic.id))} className="text-red-500 hover:bg-red-500/10 p-1 rounded-md transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <div>
                    <label className={`text-[11px] uppercase tracking-wider ${muted} block mb-1`}>Exam Type</label>
                    <select 
                      value={examType} 
                      onChange={(e) => setExamType(e.target.value)} 
                      className={inputClass}
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
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className={`text-[11px] uppercase tracking-wider ${muted} block mb-1`}>Days to Complete</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={daysToComplete} 
                        onChange={(e) => setDaysToComplete(parseInt(e.target.value) || 1)} 
                        className={inputClass} 
                      />
                    </div>
                    <div className="flex-1">
                      <label className={`text-[11px] uppercase tracking-wider ${muted} block mb-1`}>Hours/Day</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={plannerHours} 
                        onChange={(e) => setPlannerHours(parseInt(e.target.value) || 1)} 
                        className={inputClass} 
                      />
                    </div>
                  </div>
                </div>

                {plannerError && (
                  <div className="flex items-start gap-2 text-red-500 text-[12px] bg-red-500/10 p-3 rounded-lg">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <p>{plannerError}</p>
                  </div>
                )}

                <button 
                  onClick={handleGeneratePlan} 
                  disabled={isGenerating}
                  className={`w-full py-2.5 rounded-lg text-[13px] font-medium transition-all flex items-center justify-center gap-2 ${
                    isGenerating ? 'bg-purple-500/50 cursor-not-allowed text-white' : 'bg-purple-500 hover:bg-purple-600 active:scale-95 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                  }`}
                >
                  {isGenerating ? (
                    <><span className="inline-block w-4 h-4 rounded-full border-[2px] border-white/30 border-t-white animate-spin" /> Generating tasks...</>
                  ) : (
                    <><Sparkles size={16} /> Generate & Add to Calendar</>
                  )}
                </button>
              </div>
            </section>
          </div>

          {/* Column 2 */}
          <div className="space-y-6">
            

            {/* 4. Central Resource Hub & Reference Notes */}
            <section className={cardClass}>
              <h2 className="text-[15px] font-semibold tracking-tight mb-4 flex items-center gap-2">
                <LinkIcon size={16} /> Central Resource Hub
              </h2>
              
              <div className="space-y-5">
                <div>
                  <h3 className={`text-[13px] font-medium mb-3 ${muted}`}>Quick Links</h3>
                  <form onSubmit={handleAddResource} className="flex gap-2 mb-3">
                    <input name="title" type="text" placeholder="Title" required className={`${inputClass} flex-[1]`} />
                    <input name="url" type="url" placeholder="URL" required className={`${inputClass} flex-[2]`} />
                    <button type="submit" className={primaryBtn}>
                      <Plus size={16} />
                    </button>
                  </form>
                  
                  <div className="space-y-2">
                    {resources.length === 0 ? (
                       <p className={`text-[13px] ${muted} italic`}>No resources added.</p>
                    ) : (
                      resources.map(resource => (
                        <div key={resource.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${border} ${dark ? 'hover:bg-gray-900/50' : 'hover:bg-gray-50'}`}>
                          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-[13.5px] text-blue-500 hover:underline truncate mr-4">
                            {resource.title}
                          </a>
                          <button onClick={() => setResources(resources.filter(r => r.id !== resource.id))} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-md transition-colors shrink-0">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <h3 className={`text-[13px] font-medium mb-3 ${muted}`}>Reference Notes</h3>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Jot down quick formulas, ideas, or reminders here..."
                    className={`${inputClass} min-h-[150px] resize-y`}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Full Size Master Calendar at the bottom */}
        <div className="mt-8">
          <h2 className="text-[18px] font-semibold tracking-tight mb-4">Your Revision Schedule</h2>
          <MasterCalendar fullView />
        </div>
      </div>
    </div>
  );
}

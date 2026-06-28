"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import API from "@/lib/axios";
import { useAuth } from "./authContext";
import { toast } from "sonner";

export interface Exam {
  id: string;
  name: string;
  date: string;
}

export interface Course {
  id: string;
  name: string;
  totalLectures: number;
  completedLectures: number;
}

export interface Resource {
  id: string;
  title: string;
  url: string;
}

interface ExamPrepContextProps {
  exams: Exam[];
  courses: Course[];
  resources: Resource[];
  syncLoading: boolean;
  addExam: (name: string, date: string) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  addCourse: (name: string, total: number) => Promise<void>;
  updateCourseProgress: (id: string, newCompleted: number) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  addResource: (title: string, url: string) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
}

const ExamPrepContext = createContext<ExamPrepContextProps | undefined>(undefined);

export const ExamPrepProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, token, loading: authLoading } = useAuth() as any;
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [syncLoading, setSyncLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (authLoading || !isAuthenticated || !token) {
      if (!authLoading) setSyncLoading(false);
      return;
    }
    
    setSyncLoading(true);
    API.get('/exam-prep')
      .then(res => {
        if (!isMounted) return;
        setExams(res.data.exams ?? []);
        setCourses(res.data.courses ?? []);
        setResources(res.data.resources ?? []);
      })
      .catch((err) => {
        console.error("Failed to load exam prep data", err);
      })
      .finally(() => {
        if (isMounted) setSyncLoading(false);
      });
      
    return () => { isMounted = false; };
  }, [isAuthenticated, authLoading, token]);

  const addExam = async (name: string, date: string) => {
    const tempId = `tmp-${Date.now()}`;
    setExams(prev => [...prev, { id: tempId, name, date }]);
    try {
      const res = await API.post('/exam-prep/exams', { name, date });
      setExams(prev => prev.map(ex => ex.id === tempId ? res.data : ex));
    } catch {
      setExams(prev => prev.filter(ex => ex.id !== tempId));
      toast.error('Failed to save exam deadline');
    }
  };

  const deleteExam = async (id: string) => {
    const prevExams = [...exams];
    setExams(prev => prev.filter(e => e.id !== id));
    try { 
      await API.delete(`/exam-prep/exams/${id}`); 
    } catch { 
      setExams(prevExams);
      toast.error('Failed to delete deadline'); 
    }
  };

  const addCourse = async (name: string, total: number) => {
    const tempId = `tmp-${Date.now()}`;
    setCourses(prev => [...prev, { id: tempId, name, totalLectures: total, completedLectures: 0 }]);
    try {
      const res = await API.post('/exam-prep/courses', { name, totalLectures: total, completedLectures: 0 });
      setCourses(prev => prev.map(c => c.id === tempId ? res.data : c));
    } catch {
      setCourses(prev => prev.filter(c => c.id !== tempId));
      toast.error('Failed to save course plan');
    }
  };

  const updateCourseProgress = async (id: string, newCompleted: number) => {
    const prevCourses = [...courses];
    setCourses(prev => prev.map(c => c.id === id ? { ...c, completedLectures: newCompleted } : c));
    try { 
      await API.patch(`/exam-prep/courses/${id}`, { completedLectures: newCompleted }); 
    } catch { 
      setCourses(prevCourses);
      toast.error('Failed to update progress'); 
    }
  };

  const deleteCourse = async (id: string) => {
    const prevCourses = [...courses];
    setCourses(prev => prev.filter(c => c.id !== id));
    try { 
      await API.delete(`/exam-prep/courses/${id}`); 
    } catch { 
      setCourses(prevCourses);
      toast.error('Failed to delete course'); 
    }
  };

  const addResource = async (title: string, url: string) => {
    const tempId = `tmp-${Date.now()}`;
    setResources(prev => [...prev, { id: tempId, title, url }]);
    try {
      const res = await API.post('/exam-prep/resources', { title, url });
      setResources(prev => prev.map(r => r.id === tempId ? res.data : r));
    } catch {
      setResources(prev => prev.filter(r => r.id !== tempId));
      toast.error('Failed to save resource link');
    }
  };

  const deleteResource = async (id: string) => {
    const prevResources = [...resources];
    setResources(prev => prev.filter(r => r.id !== id));
    try { 
      await API.delete(`/exam-prep/resources/${id}`); 
    } catch { 
      setResources(prevResources);
      toast.error('Failed to delete resource'); 
    }
  };

  return (
    <ExamPrepContext.Provider value={{
      exams, courses, resources, syncLoading,
      addExam, deleteExam, addCourse, updateCourseProgress, deleteCourse, addResource, deleteResource
    }}>
      {children}
    </ExamPrepContext.Provider>
  );
};

export const useExamPrep = () => {
  const context = useContext(ExamPrepContext);
  if (context === undefined) {
    throw new Error("useExamPrep must be used within an ExamPrepProvider");
  }
  return context;
};

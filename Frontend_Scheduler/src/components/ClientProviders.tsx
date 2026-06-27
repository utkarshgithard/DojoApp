"use client";

import { AttendanceProvider } from "@/context/AttendanceContext";
import { SocketProvider } from "@/context/SocketContext";
import { DarkModeProvider } from "@/context/DarkModeContext";
import AuthProvider, { useAuth } from "@/context/authContext";
import { CommunityProvider } from "@/context/CommunityContext";
import { PostProvider } from "@/context/PostContext";
import { CommunityGroupProvider } from "@/context/CommunityGroupContext";
import { NetworkProvider } from "@/context/NetworkContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { TimerProvider } from "@/context/TimerContext";
import { CalendarProvider } from "@/context/CalendarContext";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import InternetStatus from "./InternetStatus";
import OnboardingTour from "./OnboardingTour";
import { Toaster } from "@/components/ui/sonner";
import AuthPromptModal from "./community/AuthPromptModal";
import AiChatbot from "./AiChatbot";

function ClientProvidersInner({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth() as any;
  const pathname = usePathname();
  const noNavbarRoutes = ['/', '/login', '/register', '/verify', '/verify-email'];
  const showNavbar = !noNavbarRoutes.some(route => pathname === route || pathname.startsWith('/verify-email/'))
    && !pathname.startsWith('/session/');

  const sidebarRoutes = ['/dashboard', '/sessions', '/friends', '/community', '/setup-schedule', '/calendar', '/exam-prep', '/settings', '/notifications'];
  const showSidebar = isAuthenticated && sidebarRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') setSidebarCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  };

  return (
    <>
      <InternetStatus />
      {showNavbar && <Navbar />}
      {showSidebar ? (
        <div className="min-h-screen w-full flex">
          <Sidebar collapsed={sidebarCollapsed} toggleCollapse={toggleSidebar} />
          <div className={`flex-1 w-full min-w-0 transition-all duration-300 ${mounted && sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
            {children}
          </div>
          <OnboardingTour />
        </div>
      ) : (
        children
      )}
      <Toaster />
      <AuthPromptModal />
      <AiChatbot />
    </>
  );
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <AttendanceProvider>
            <PostProvider>
              <CommunityProvider>
                <CommunityGroupProvider>
                  <NetworkProvider>
                    <DarkModeProvider>
                      <TimerProvider>
                        <CalendarProvider>
                          <ClientProvidersInner>
                            {children}
                          </ClientProvidersInner>
                        </CalendarProvider>
                      </TimerProvider>
                    </DarkModeProvider>
                  </NetworkProvider>
                </CommunityGroupProvider>
              </CommunityProvider>
            </PostProvider>
          </AttendanceProvider>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

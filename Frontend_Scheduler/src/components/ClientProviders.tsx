"use client";

import { AttendanceProvider } from "@/context/AttendanceContext";
import { SocketProvider } from "@/context/SocketContext";
import { DarkModeProvider } from "@/context/DarkModeContext";
import AuthProvider from "@/context/authContext";
import { CommunityProvider } from "@/context/CommunityContext";
import { CommunityGroupProvider } from "@/context/CommunityGroupContext";
import { NetworkProvider } from "@/context/NetworkContext";
import { NotificationProvider } from "@/context/NotificationContext";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import InternetStatus from "./InternetStatus";
import OnboardingTour from "./OnboardingTour";
import { Toaster } from "@/components/ui/sonner";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noNavbarRoutes = ['/', '/login', '/register', '/verify', '/verify-email'];
  const showNavbar = !noNavbarRoutes.some(route => pathname === route || pathname.startsWith('/verify-email/'))
    && !pathname.startsWith('/session/');
  
  const sidebarRoutes = ['/dashboard', '/sessions', '/friends', '/community', '/setup-schedule', '/calendar', '/settings', '/notifications'];
  const showSidebar = sidebarRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

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
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <AttendanceProvider>
            <CommunityProvider>
              <CommunityGroupProvider>
              <NetworkProvider>
                <DarkModeProvider>
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
                </DarkModeProvider>
              </NetworkProvider>
              </CommunityGroupProvider>
            </CommunityProvider>
          </AttendanceProvider>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

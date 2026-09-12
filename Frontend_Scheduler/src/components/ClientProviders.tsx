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
import { ChatProvider } from "@/context/ChatContext";
import { E2EEProvider } from "@/context/E2EEContext";
import { ExamPrepProvider } from "@/context/ExamPrepContext";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import InternetStatus from "./InternetStatus";
import OnboardingTour from "./OnboardingTour";
import { purgePoisonedEntries } from "@/lib/safeStorage";
import { Toaster } from "@/components/ui/sonner";
import AuthPromptModal from "./community/AuthPromptModal";
import AiChatbot from "./AiChatbot";
import MobileBottomNav from "./MobileBottomNav";

// Safeguard against Next.js 16 devtools unhandled releasePointerCapture DOMException
if (typeof window !== "undefined" && typeof Element !== "undefined") {
  const originalReleasePointerCapture = Element.prototype.releasePointerCapture;
  if (originalReleasePointerCapture) {
    Element.prototype.releasePointerCapture = function (pointerId: number) {
      if (this.hasPointerCapture && this.hasPointerCapture(pointerId)) {
        try {
          originalReleasePointerCapture.call(this, pointerId);
        } catch {
          // Suppress DOMException if pointer capture was already released or inactive
        }
      }
    };
  }
}

function ClientProvidersInner({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth() as any;
  const pathname = usePathname();
  const noNavbarRoutes = ['/', '/login', '/register', '/verify', '/verify-email'];
  const isMobileChatActive = pathname.startsWith('/chat/') && pathname !== '/chat';
  
  const showNavbar = !noNavbarRoutes.some(route => pathname === route || pathname.startsWith('/verify-email/'))
    && !pathname.startsWith('/session/')
    && !isMobileChatActive;

  const sidebarRoutes = ['/dashboard', '/friends', '/community', '/setup-schedule', '/calendar', '/exam-prep', '/me', '/settings', '/notifications', '/chat'];
  const showSidebar = isAuthenticated && sidebarRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') setSidebarCollapsed(true);
    // One-time cleanup: remove caches poisoned by the legacy base64 avatar bug.
    purgePoisonedEntries();
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
          {!isMobileChatActive && <MobileBottomNav />}
          <div className={`flex-1 w-full min-w-0 transition-all duration-300 ${!isMobileChatActive ? 'pb-[80px] md:pb-0' : ''} ${mounted && sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
            {children}
          </div>
          <OnboardingTour />
        </div>
      ) : (
        children
      )}
      <Toaster />
      <AuthPromptModal />
      {/* AI chatbot hidden for now */}
      {/* {!pathname.startsWith('/chat') && <AiChatbot />} */}
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
                          <ExamPrepProvider>
                            <ChatProvider>
                              <E2EEProvider>
                                <ClientProvidersInner>
                                  {children}
                                </ClientProvidersInner>
                              </E2EEProvider>
                            </ChatProvider>
                          </ExamPrepProvider>
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

"use client";

import { AttendanceProvider } from "@/context/AttendanceContext";
import { SocketProvider } from "@/context/SocketContext";
import { DarkModeProvider } from "@/context/DarkModeContext";
import AuthProvider from "@/context/authContext";
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
  
  const sidebarRoutes = ['/dashboard', '/sessions', '/friends', '/setup-schedule', '/calendar', '/settings'];
  const showSidebar = sidebarRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

  return (
    <AuthProvider>
      <SocketProvider>
        <AttendanceProvider>
          <DarkModeProvider>
            <InternetStatus />
            {showNavbar && <Navbar />}
            {showSidebar ? (
              <div className="min-h-screen w-full flex">
                <Sidebar />
                <div className="flex-1 md:pl-64 w-full min-w-0">
                  {children}
                </div>
                <OnboardingTour />
              </div>
            ) : (
              children
            )}
            <Toaster />
          </DarkModeProvider>
        </AttendanceProvider>
      </SocketProvider>
    </AuthProvider>
  );
}


"use client";

import { AttendanceProvider } from "@/context/AttendanceContext";
import { SocketProvider } from "@/context/SocketContext";
import { DarkModeProvider } from "@/context/DarkModeContext";
import AuthProvider from "@/context/authContext";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import InternetStatus from "./InternetStatus";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noNavbarRoutes = ['/', '/login', '/register', '/verify', '/verify-email'];
  const showNavbar = !noNavbarRoutes.some(route => pathname === route || pathname.startsWith('/verify-email/'));

  return (
    <AuthProvider>
      <SocketProvider>
        <AttendanceProvider>
          <DarkModeProvider>
            <InternetStatus />
            {showNavbar && <Navbar />}
            {children}
          </DarkModeProvider>
        </AttendanceProvider>
      </SocketProvider>
    </AuthProvider>
  );
}


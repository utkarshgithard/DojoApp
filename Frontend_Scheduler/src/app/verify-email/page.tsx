"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, CheckCircle2, ArrowRight, LogOut, RefreshCw } from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';
import { useAuth } from '@/context/authContext';
import { auth } from '@/lib/firebase';
import { sendEmailVerification } from 'firebase/auth';

function Spinner() {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full border-[1.5px] border-current border-t-transparent animate-spin"
      aria-hidden="true"
    />
  );
}

export default function VerifyEmailPrompt() {
  const { darkMode } = useDarkMode() as any;
  const { isAuthenticated, emailVerified, loading, logout } = useAuth() as any;
  const router = useRouter();

  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the user is verified, redirect them to dashboard
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (emailVerified) {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, emailVerified, loading, router]);

  // Check if they verified their email manually
  const handleCheckVerification = async () => {
    setError(null);
    setCheckLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Force Firebase to fetch latest user info
        await currentUser.reload();
        
        if (currentUser.emailVerified) {
          // Force Token refresh to update claims
          await currentUser.getIdToken(true);
          // Reload the page to refresh context state
          window.location.reload();
        } else {
          setError('Email is still unverified. Please check your inbox and click the verification link.');
        }
      } else {
        setError('No active session found. Please sign in again.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to check verification status. Please try again.');
    } finally {
      setCheckLoading(false);
    }
  };

  // Resend the email verification link
  const handleResendEmail = async () => {
    setError(null);
    setResendLoading(true);
    setResendSent(false);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await sendEmailVerification(currentUser);
        setResendSent(true);
        setTimeout(() => setResendSent(false), 5000); // Reset status after 5s
      } else {
        setError('No active session found. Please sign in again.');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a moment before trying again.');
      } else {
        setError('Failed to send verification link. Please try again.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  const dark = darkMode;
  const border = dark ? 'border-gray-800' : 'border-gray-200';
  const muted = dark ? 'text-gray-400' : 'text-gray-500';

  if (loading) {
    return (
      <div className={`min-h-screen flex justify-center items-center transition-colors duration-300 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
        <span className="inline-block w-6 h-6 rounded-full border-[2px] border-current border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      {/* Top bar */}
      <div className={`flex justify-between items-center px-5 py-4 border-b ${border}`}>
        <span className="text-[16px] font-medium">DojoClass</span>
        <button
          onClick={logout}
          className={`flex items-center gap-1.5 text-[13px] transition-colors ${muted} hover:text-current`}
        >
          <LogOut size={14} /> Log out
        </button>
      </div>

      {/* Main card */}
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className={`w-full max-w-[380px] p-6 rounded-2xl border text-center ${border} ${dark ? 'bg-zinc-950/40' : 'bg-zinc-50/50'} shadow-sm`}>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${dark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
            <Mail className="w-7 h-7 text-blue-500" />
          </div>
          
          <h1 className="text-[20px] font-semibold mb-2">Verify your email address</h1>
          <p className={`text-[13px] leading-relaxed ${muted} mb-6`}>
            We've sent a verification link to your email. Click the link in that email to activate your account and access the dashboard.
          </p>

          {error && (
            <div className={`flex items-start gap-2 px-3.5 py-2.5 rounded-lg mb-4 text-[12px] text-left leading-relaxed
              ${dark ? 'bg-red-900/20 text-red-400 border border-red-800/40' : 'bg-red-50 text-red-600 border border-red-100'}`}>
              <span className="mt-[2px] flex-shrink-0">⚠️</span>
              {error}
            </div>
          )}

          <div className="space-y-2.5">
            {/* Check status button */}
            <button
              onClick={handleCheckVerification}
              disabled={checkLoading}
              className={`w-full py-2.5 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 transition-opacity
                ${dark ? 'bg-white text-black' : 'bg-black text-white'}
                disabled:opacity-40`}
            >
              {checkLoading ? <><Spinner /> Checking...</> : <><RefreshCw size={14} /> I've verified my email</>}
            </button>

            {/* Resend button */}
            <button
              onClick={handleResendEmail}
              disabled={resendLoading}
              className={`w-full py-2.5 rounded-lg text-[13.5px] font-medium border transition-colors flex items-center justify-center gap-1.5
                ${dark
                  ? 'border-gray-800 text-gray-200 hover:bg-gray-900'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                } disabled:opacity-40`}
            >
              {resendLoading ? <><Spinner /> Sending...</> : resendSent ? 'Link sent — check your email!' : 'Resend verification link'}
            </button>
          </div>

          <p className={`text-[11px] mt-6 leading-relaxed ${muted}`}>
            Can't find the email? Check your spam/junk folder or request a new link above.
          </p>
        </div>
      </div>
    </div>
  );
}

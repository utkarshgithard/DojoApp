"use client";

import { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';
import { auth } from '@/lib/firebase';
import { sendSignInLinkToEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { AuthContext } from '@/context/authContext';
import API from '@/lib/axios';

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full border-[1.5px] border-current border-t-transparent animate-spin"
      aria-hidden="true"
    />
  );
}

export default function Register() {
  const { darkMode } = useDarkMode() as any;
  const { login, isAuthenticated, loading: authLoading } = useContext(AuthContext) as any;
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSent(false);
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/verify',
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, form.email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', form.email);
      window.localStorage.setItem('nameForSignUp', form.name);
      setSent(true);
    } catch (err: any) {
      console.error(err);
      alert('Registration failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const token = await user.getIdToken();
      await API.post(
        '/auth/sync',
        { name: user.displayName, email: user.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      login(token);
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        alert('Google sign-up failed: ' + err.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const dark = darkMode;
  const border = dark ? 'border-gray-800' : 'border-gray-200';
  const muted = dark ? 'text-gray-400' : 'text-gray-500';
  const inputClass = `w-full px-3.5 py-2.5 text-sm rounded-lg border outline-none transition-colors
    ${dark
      ? 'bg-black border-gray-700 text-white placeholder-gray-600 focus:border-gray-500'
      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'
    }`;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>

      {/* Top bar */}
      <div className={`flex justify-between items-center px-5 py-4 border-b ${border}`}>
        <span className="text-[16px] font-medium">DojoClass</span>
        <button
          onClick={() => router.back()}
          className={`flex items-center gap-1 text-[13px] transition-colors ${muted} hover:text-current`}
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      {/* Form area */}
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[360px]">

          <h1 className="text-[22px] font-medium mb-1">Create account</h1>
          <p className={`text-[13px] mb-6 ${muted}`}>
            Start tracking your attendance in seconds
          </p>

          {/* Magic link form */}
          <form onSubmit={handleSubmit} className="space-y-2.5 mb-4">
            <input
              type="text"
              placeholder="Full name"
              className={inputClass}
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email address"
              className={inputClass}
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
            <button
              type="submit"
              disabled={loading || googleLoading}
              className={`w-full py-2.5 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 transition-opacity
                ${dark ? 'bg-white text-black' : 'bg-black text-white'}
                disabled:opacity-40`}
            >
              {loading ? (
                <><Spinner /> Sending link...</>
              ) : sent ? (
                'Link sent — check your email'
              ) : (
                'Send magic link'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`flex-1 h-px ${dark ? 'bg-gray-800' : 'bg-gray-200'}`} />
            <span className={`text-[11px] uppercase tracking-widest ${muted}`}>or</span>
            <div className={`flex-1 h-px ${dark ? 'bg-gray-800' : 'bg-gray-200'}`} />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className={`w-full py-2.5 rounded-lg text-[14px] border flex items-center justify-center gap-2 transition-colors mb-6
              ${dark
                ? 'border-gray-700 text-gray-200 hover:bg-gray-900'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              } disabled:opacity-40`}
          >
            {googleLoading ? (
              <><Spinner /> Signing up...</>
            ) : (
              <><GoogleIcon /> Continue with Google</>
            )}
          </button>

          {/* Footer */}
          <p className={`text-center text-[12px] ${muted}`}>
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className={`font-medium underline underline-offset-2 ${dark ? 'text-white' : 'text-gray-900'}`}
            >
              Log in
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}
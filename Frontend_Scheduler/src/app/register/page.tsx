"use client";

import { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';
import { auth } from '@/lib/firebase';
import { sendSignInLinkToEmail, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
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

// Map Firebase auth error codes to user-friendly messages
function friendlyAuthError(code: string, fallback: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/operation-not-allowed': 'Email/password sign-up is not enabled. Please contact support.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/popup-closed-by-user': '',
  };
  return map[code] ?? fallback;
}

// Basic email format validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Password strength: at least 8 chars, 1 uppercase, 1 number
function getPasswordStrength(pwd: string): { label: string; color: string; width: string } {
  if (pwd.length === 0) return { label: '', color: '', width: '0%' };
  if (pwd.length < 6) return { label: 'Too short', color: 'bg-red-500', width: '25%' };
  if (pwd.length < 8) return { label: 'Weak', color: 'bg-orange-400', width: '50%' };
  if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  return { label: 'Fair', color: 'bg-yellow-400', width: '75%' };
}

export default function Register() {
  const { darkMode } = useDarkMode() as any;
  const { login, isAuthenticated, loading: authLoading } = useContext(AuthContext) as any;
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '' });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMethod, setAuthMethod] = useState<'password' | 'magic-link'>('password');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Email verification pending state
  const [verificationSent, setVerificationSent] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.push('/community');
  }, [isAuthenticated, authLoading, router]);

  // Capture invite/referral code from URL and store in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref') || params.get('invite');
      if (refCode) {
        localStorage.setItem('dojo_invite_code', refCode);
      }
    }
  }, []);

  const validateEmail = (value: string) => {
    if (value && !isValidEmail(value)) {
      setEmailError('Please enter a valid email address.');
    } else {
      setEmailError(null);
    }
  };

  const handlePasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!isValidEmail(form.email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, form.email, password);
      const user = result.user;
      
      // Update display name
      await updateProfile(user, { displayName: form.name });

      // Send email verification
      await sendEmailVerification(user);
      
      const token = await user.getIdToken();
      
      // Sync with backend
      await API.post(
        '/auth/sync',
        { 
          name: form.name, 
          email: form.email,
          inviteCode: typeof window !== 'undefined' ? localStorage.getItem('dojo_invite_code') : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (typeof window !== 'undefined') {
        localStorage.removeItem('dojo_invite_code');
      }
      
      login(token);
      setVerificationSent(true);
    } catch (err: any) {
      console.error(err);
      const msg = friendlyAuthError(err.code, err.message);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(form.email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setSent(false);
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/login',
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, form.email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', form.email);
      window.localStorage.setItem('nameForSignUp', form.name);
      setSent(true);
    } catch (err: any) {
      console.error(err);
      setError(friendlyAuthError(err.code, err.message) || 'Failed to send link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const token = await user.getIdToken();
      await API.post(
        '/auth/sync',
        { 
          name: user.displayName, 
          email: user.email,
          inviteCode: typeof window !== 'undefined' ? localStorage.getItem('dojo_invite_code') : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (typeof window !== 'undefined') {
        localStorage.removeItem('dojo_invite_code');
      }
      login(token);
      router.push('/community');
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(friendlyAuthError(err.code, 'Google sign-up failed. Please try again.'));
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
  
  const passwordStrength = getPasswordStrength(password);

  // Email verification pending screen
  if (verificationSent) {
    return (
      <div className={`min-h-screen flex flex-col transition-colors duration-300 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
        <div className={`flex justify-between items-center px-5 py-4 border-b ${border}`}>
          <span className="text-[16px] font-medium">DojoClass</span>
        </div>
        <div className="flex-1 flex items-center justify-center px-5 py-12">
          <div className={`w-full max-w-[360px] p-6 rounded-2xl border text-center ${border} ${dark ? 'bg-zinc-950' : 'bg-zinc-50/50'}`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${dark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-[20px] font-semibold mb-2">Verify your email</h1>
            <p className={`text-[13px] leading-relaxed ${muted} mb-5`}>
              We sent a verification link to <span className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{form.email}</span>. Click the link to activate your account.
            </p>
            <p className={`text-[12px] ${muted} mb-5`}>
              You can still use the app while your email is unverified. Check your inbox (and spam folder).
            </p>
            <button
              onClick={() => router.push('/community')}
              className={`w-full py-2.5 rounded-lg text-[13.5px] font-medium transition-opacity hover:opacity-80
                ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

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

          {/* Auth Method Tabs */}
          <div className={`flex p-1 rounded-xl mb-5 ${dark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-100'}`}>
            <button
              type="button"
              onClick={() => { setAuthMethod('password'); setError(null); }}
              className={`flex-1 py-1.5 text-[12.5px] font-semibold rounded-lg transition-all ${
                authMethod === 'password'
                  ? dark
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('magic-link'); setError(null); }}
              className={`flex-1 py-1.5 text-[12.5px] font-semibold rounded-lg transition-all ${
                authMethod === 'magic-link'
                  ? dark
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Magic Link
            </button>
          </div>

          {/* Inline error */}
          {error && (
            <div className={`flex items-start gap-2 px-3.5 py-2.5 rounded-lg mb-3 text-[12.5px] leading-relaxed
              ${dark ? 'bg-red-900/20 text-red-400 border border-red-800/40' : 'bg-red-50 text-red-600 border border-red-100'}`}>
              <svg className="w-3.5 h-3.5 mt-[1px] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {authMethod === 'password' ? (
            <form onSubmit={handlePasswordSignUp} className="space-y-2.5 mb-4">
              <input
                type="text"
                placeholder="Full name"
                className={inputClass}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
              <div>
                <input
                  type="email"
                  placeholder="Email address"
                  className={`${inputClass} ${emailError ? (dark ? '!border-red-700' : '!border-red-400') : ''}`}
                  value={form.email}
                  onChange={e => {
                    setForm({ ...form, email: e.target.value });
                    validateEmail(e.target.value);
                    setError(null);
                  }}
                  required
                />
                {emailError && (
                  <p className="text-red-500 text-[11.5px] mt-1 ml-0.5">{emailError}</p>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className={inputClass}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold ${muted} hover:text-current`}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="space-y-1 pt-0.5">
                  <div className={`w-full h-1 rounded-full overflow-hidden ${dark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: passwordStrength.width }}
                    />
                  </div>
                  {passwordStrength.label && (
                    <p className={`text-[11px] ${
                      passwordStrength.label === 'Strong' ? 'text-green-500' :
                      passwordStrength.label === 'Fair' ? 'text-yellow-500' :
                      'text-orange-500'
                    }`}>{passwordStrength.label}</p>
                  )}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || googleLoading || !!emailError}
                className={`w-full py-2.5 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 transition-opacity
                  ${dark ? 'bg-white text-black' : 'bg-black text-white'}
                  disabled:opacity-40`}
              >
                {loading ? (
                  <><Spinner /> Creating account...</>
                ) : (
                  'Create account'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2.5 mb-4">
              <input
                type="text"
                placeholder="Full name"
                className={inputClass}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
              <div>
                <input
                  type="email"
                  placeholder="Email address"
                  className={`${inputClass} ${emailError ? (dark ? '!border-red-700' : '!border-red-400') : ''}`}
                  value={form.email}
                  onChange={e => {
                    setForm({ ...form, email: e.target.value });
                    validateEmail(e.target.value);
                    setError(null);
                  }}
                  required
                />
                {emailError && (
                  <p className="text-red-500 text-[11.5px] mt-1 ml-0.5">{emailError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || googleLoading || !!emailError}
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
          )}

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
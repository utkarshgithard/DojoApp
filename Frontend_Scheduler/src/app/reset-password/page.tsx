"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';
import { auth } from '@/lib/firebase';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';

function Spinner() {
  return (
    <span
      className="inline-block w-6 h-6 rounded-full border-[2.5px] border-current border-t-transparent animate-spin"
      aria-hidden="true"
    />
  );
}

// Map Firebase auth error codes to user-friendly messages
function friendlyAuthError(code: string, fallback: string): string {
  const map: Record<string, string> = {
    'auth/expired-action-code': 'This password reset link has expired. Please request a new one.',
    'auth/invalid-action-code': 'This link is invalid or has already been used. Please request a new one.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/user-not-found': 'No user found associated with this link.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
  };
  return map[code] ?? fallback;
}

// Password strength checking
function getPasswordStrength(pwd: string): { label: string; color: string; width: string } {
  if (pwd.length === 0) return { label: '', color: '', width: '0%' };
  if (pwd.length < 6) return { label: 'Too short', color: 'bg-red-500', width: '25%' };
  if (pwd.length < 8) return { label: 'Weak', color: 'bg-orange-400', width: '50%' };
  if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  return { label: 'Fair', color: 'bg-yellow-400', width: '75%' };
}

function ResetPasswordForm() {
  const { darkMode } = useDarkMode() as any;
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams?.get('oobCode');

  const [email, setEmail] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Verify the oobCode on component mount
  useEffect(() => {
    if (!oobCode) {
      setVerifyError('No reset code found in the URL. Please request a new link from the login page.');
      setVerifying(false);
      return;
    }

    const checkCode = async () => {
      try {
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
      } catch (err: any) {
        console.error(err);
        setVerifyError(friendlyAuthError(err.code, 'The password reset link is invalid or expired.'));
      } finally {
        setVerifying(false);
      }
    };

    checkCode();
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!oobCode) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(friendlyAuthError(err.code, 'Failed to reset password. Please try again.'));
    } finally {
      setLoading(false);
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

  // Loading/Verifying the link state
  if (verifying) {
    return (
      <div className="text-center py-12">
        <Spinner />
        <p className={`mt-4 text-sm ${muted} animate-pulse`}>Validating reset link...</p>
      </div>
    );
  }

  // Error verifying the link (expired or corrupted code)
  if (verifyError) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto text-red-500">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-[18px] font-semibold">Invalid reset link</h2>
        <p className={`text-[13px] leading-relaxed max-w-[300px] mx-auto ${muted}`}>
          {verifyError}
        </p>
        <button
          onClick={() => router.push('/login')}
          className={`w-full py-2.5 rounded-lg text-[13.5px] font-medium border transition-colors mt-2
            ${dark
              ? 'border-gray-700 text-gray-200 hover:bg-gray-900'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
        >
          Return to Login
        </button>
      </div>
    );
  }

  // Password reset successful screen
  if (success) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto text-green-500">
          <CheckCircle2 size={24} />
        </div>
        <h2 className="text-[18px] font-semibold">Password updated</h2>
        <p className={`text-[13px] leading-relaxed max-w-[300px] mx-auto ${muted}`}>
          Your password has been successfully reset. You can now log in with your new password.
        </p>
        <button
          onClick={() => router.push('/login')}
          className={`w-full py-2.5 rounded-lg text-[13.5px] font-medium transition-opacity hover:opacity-80 mt-2
            ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[22px] font-medium mb-1 text-center">Reset your password</h1>
      <p className={`text-[13px] mb-6 text-center ${muted}`}>
        {email ? `Resetting password for ${email}` : 'Enter your new secure password'}
      </p>

      {error && (
        <div className={`flex items-start gap-2 px-3.5 py-2.5 rounded-lg mb-4 text-[12.5px] leading-relaxed
          ${dark ? 'bg-red-900/20 text-red-400 border border-red-800/40' : 'bg-red-50 text-red-600 border border-red-100'}`}>
          <AlertCircle className="w-3.5 h-3.5 mt-[1px] flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* New Password */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New password"
            className={inputClass}
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null); }}
            required
            autoFocus
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

        {/* Confirm Password */}
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Confirm new password"
          className={inputClass}
          value={confirmPassword}
          onChange={e => { setConfirmPassword(e.target.value); setError(null); }}
          required
        />

        <button
          type="submit"
          disabled={loading || password.length < 6 || password !== confirmPassword}
          className={`w-full py-2.5 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 transition-opacity
            ${dark ? 'bg-white text-black' : 'bg-black text-white'}
            disabled:opacity-40`}
        >
          {loading ? <><Spinner /> Resetting password...</> : 'Reset password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPassword() {
  const { darkMode } = useDarkMode() as any;
  const router = useRouter();
  
  const dark = darkMode;
  const border = dark ? 'border-gray-800' : 'border-gray-200';
  const muted = dark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      {/* Top bar */}
      <div className={`flex justify-between items-center px-5 py-4 border-b ${border}`}>
        <span className="text-[16px] font-medium">DojoClass</span>
        <button
          onClick={() => router.push('/login')}
          className={`flex items-center gap-1 text-[13px] transition-colors ${muted} hover:text-current`}
        >
          <ArrowLeft size={14} /> Back to Login
        </button>
      </div>

      {/* Form area */}
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[360px]">
          <Suspense fallback={
            <div className="text-center py-12">
              <Spinner />
              <p className={`mt-4 text-sm ${muted} animate-pulse`}>Loading reset form...</p>
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useDarkMode } from '@/context/DarkModeContext';
import { auth } from '@/lib/firebase';
import { sendSignInLinkToEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { AuthContext } from '@/context/authContext';
import API from '@/lib/axios';

import { useEffect } from 'react';

export default function Register() {
  const { darkMode } = useDarkMode() as any;
  const { login, isAuthenticated, loading: authLoading } = useContext(AuthContext) as any;
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/verify', // Redirect to verify page
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, form.email, actionCodeSettings);

      // Save to localStorage for the verification page
      window.localStorage.setItem('emailForSignIn', form.email);
      window.localStorage.setItem('nameForSignUp', form.name);

      alert("✨ Magic link sent! Please check your email to sign in.");
    } catch (err: any) {
      console.error(err);
      alert('❌ Registration failed: ' + err.message);
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

      // Sync with database
      await API.post('/auth/sync', 
        { name: user.displayName, email: user.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      login(token);
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        alert('❌ Google sign-in failed: ' + err.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex justify-center items-center transition duration-300 ${darkMode ? 'bg-black text-white' : 'bg-gradient-to-br from-blue-100 to-white text-black'}`}>
      <div
        className={`p-8 shadow-xl rounded-xl w-full max-w-md space-y-4 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}
      >
        <h2 className="text-2xl font-bold text-center">Create Account</h2>
        <p className="text-center text-sm text-gray-500 mb-4">Choose your preferred sign-up method</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            className={`w-full border px-4 py-2 rounded ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className={`w-full border px-4 py-2 rounded ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <button 
            type="submit" 
            disabled={loading || googleLoading}
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50 transition duration-200"
          >
            {loading ? 'Sending Link...' : 'Send Magic Link'}
          </button>
        </form>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase">Or</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          className={`w-full flex items-center justify-center gap-3 py-2 border rounded font-semibold transition duration-200 ${
            darkMode 
              ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700' 
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          } disabled:opacity-50`}
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          {googleLoading ? 'Signing up...' : 'Sign up with Google'}
        </button>

        <p className="text-center text-sm pt-2">
          Already have an account?{' '}
          <span className="text-blue-700 cursor-pointer hover:underline font-medium" onClick={() => router.push('/login')}>
            Log In
          </span>
        </p>
      </div>
    </div>
  );
}


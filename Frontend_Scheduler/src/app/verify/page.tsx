"use client";

import { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { isSignInWithEmailLink, signInWithEmailLink, updateProfile } from 'firebase/auth';
import API from '@/lib/axios';
import { AuthContext } from '@/context/authContext';

export default function Verify() {
  const router = useRouter();
  const { login } = useContext(AuthContext) as any;
  const [status, setStatus] = useState("Verifying your login link...");
  const [error, setError] = useState<string | null>(null);
  
  // Provide an email prompt state if email isn't in localStorage
  const [promptEmail, setPromptEmail] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  const completeSignIn = async (emailToUse: string) => {
    try {
      setStatus("Signing you in securely...");
      
      const result = await signInWithEmailLink(auth, emailToUse, window.location.href);
      
      // If we stored a name during registration, update the Firebase profile
      const storedName = window.localStorage.getItem('nameForSignUp');
      if (storedName && result.user) {
        await updateProfile(result.user, { displayName: storedName });
      }

      // Get the token
      const token = await result.user.getIdToken();
      
      setStatus("Syncing with database...");
      
      // Upsert the user in our PostgreSQL database
      await API.post('/auth/sync', 
        { name: storedName || result.user.displayName, email: emailToUse },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Clean up localStorage
      window.localStorage.removeItem('emailForSignIn');
      window.localStorage.removeItem('nameForSignUp');

      login(token);
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to complete sign in. The link might be expired or already used.');
      setStatus("");
    }
  };

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      
      if (!email) {
        // User opened the link on a different device or browser
        setPromptEmail(true);
        setStatus("");
      } else {
        completeSignIn(email);
      }
    } else {
      setError("This sign-in link is not valid or you are already logged in.");
      setStatus("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPromptEmail(false);
    completeSignIn(emailInput);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-100 to-white text-black p-4">
      <div className="p-8 shadow-xl rounded-xl w-full max-w-md bg-white text-center">
        <h2 className="text-2xl font-bold mb-4">Verification</h2>
        
        {status && <p className="text-blue-600 font-semibold animate-pulse">{status}</p>}
        
        {error && (
          <div className="space-y-4">
            <p className="text-red-500 font-medium">{error}</p>
            <button 
              onClick={() => router.push('/login')}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
            >
              Go back to Login
            </button>
          </div>
        )}

        {promptEmail && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">
              Please confirm your email address to complete the sign-in process.
            </p>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full border px-4 py-2 rounded"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
            />
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Verify & Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

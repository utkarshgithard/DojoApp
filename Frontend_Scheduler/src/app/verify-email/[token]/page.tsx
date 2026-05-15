"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import API from '@/lib/axios';

export default function VerifyEmail() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();
  const [status, setStatus] = useState('Verifying...');

  useEffect(() => {
    if (!token) return;
    
    const verifyToken = async () => {
      try {
        await API.get(`/auth/verify-email/${token}`);
        setStatus('✅ Email verified successfully! Redirecting to Dashboard...');
        setTimeout(() => router.push('/dashboard'), 3000);
      } catch (err) {
        setStatus('❌ Invalid or expired token.');
      }
    };

    verifyToken();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black text-black dark:text-white">
      <div className="text-center p-6">
        <h2 className="text-2xl font-bold">Email Verification</h2>
        <p className="mt-4">{status}</p>
      </div>
    </div>
  );
}

/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { Hero } from '@/components/student-landing/Hero';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/community');
    }
  }, [isAuthenticated, loading, router]);

  return (
    <>
      <meta name="google-site-verification" content="MH-qCpIalYR4S1flnD1CRaPx_tUMSziNE9Y6cLpgdnI" />
      <Hero />
    </>
  );
}

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';

interface LandingHeaderProps {
  dark: boolean;
}

export function LandingHeader({ dark }: LandingHeaderProps) {
  const router = useRouter();
  const { toggleDarkMode } = useDarkMode() as any;

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${dark ? 'bg-[#09090B]/85 border-zinc-800/80' : 'bg-white/85 border-[#EBEAE4]/80'}`}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <nav aria-label="Main navigation" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight font-serif" aria-label="DojoClass home">
            DojoClass
          </span>
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={toggleDarkMode}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`p-2 rounded-full border transition-all duration-300 ${
              dark 
                ? 'border-zinc-850 text-zinc-300 hover:bg-zinc-900 hover:text-white' 
                : 'border-neutral-200 text-[#6A635B] hover:bg-[#FAF9F5] hover:text-[#1C1917]'
            }`}
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Mobile-only compact auth button (sign up only) */}
          <button 
            onClick={() => router.push('/register')}
            className={`md:hidden text-xs font-semibold px-3 py-1.5 rounded-full ${
              dark 
                ? 'bg-zinc-100 text-zinc-950 hover:bg-white' 
                : 'bg-zinc-950 text-white hover:bg-zinc-800'
            }`}
          >
            Sign up
          </button>

          {/* Desktop-only auth buttons */}
          <button 
            onClick={() => router.push('/login')}
            className={`hidden md:block text-sm font-medium transition-colors px-4 py-2 rounded-full border ${
              dark 
                ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white' 
                : 'border-[#EBEAE4] text-[#1C1917] hover:bg-[#FAF9F5]'
            }`}
          >
            Log in
          </button>

          <button 
            onClick={() => router.push('/register')}
            className={`hidden md:block text-sm font-medium px-5 py-2 rounded-full transition-transform hover:scale-105 active:scale-95 duration-200 ${
              dark 
                ? 'bg-zinc-100 text-zinc-950 hover:bg-white' 
                : 'bg-zinc-950 text-white hover:bg-zinc-800'
            }`}
          >
            Get started
          </button>
        </div>
      </div>
    </header>
  );
}

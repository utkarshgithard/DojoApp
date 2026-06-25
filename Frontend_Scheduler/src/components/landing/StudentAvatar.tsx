import React from 'react';

export const getStudentAvatar = (name: string, size: string = "w-8 h-8") => {
  switch (name) {
    case 'Ananya':
    case 'AM':
      return (
        <div className={`${size} rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 shadow-sm shrink-0 bg-gradient-to-tr from-pink-400 to-violet-500 flex items-center justify-center`}>
          <svg className="w-full h-full" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 19c-5 0-9 3-9 7v2h18v-2c0-4-4-7-9-7z" fill="#F5F3FF" />
            <path d="M13 22h6v6h-6z" fill="#DDD6FE" />
            <rect x="14.5" y="17.5" width="3" height="4" rx="1.5" fill="#FED7AA" />
            <circle cx="16" cy="14" r="5.5" fill="#FDBA74" />
            <path d="M10 11.5c.5-4 4-5.5 6-5.5s5.5 1.5 6 5.5c.5 4 0 4-1 4.5s-2-2-5-2-4 2-5 2-1-.5-1-4.5z" fill="#1F2937" />
            <circle cx="21" cy="9" r="2.5" fill="#1F2937" />
            <circle cx="14" cy="13.5" r="0.75" fill="#111827" />
            <circle cx="18" cy="13.5" r="0.75" fill="#111827" />
            <path d="M14.5 15.5c.5.8 2.5.8 3 0" stroke="#111827" strokeWidth="0.75" strokeLinecap="round" />
          </svg>
        </div>
      );
    case 'Rohan':
    case 'RM':
      return (
        <div className={`${size} rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 shadow-sm shrink-0 bg-gradient-to-tr from-blue-400 to-emerald-500 flex items-center justify-center`}>
          <svg className="w-full h-full" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 19c-5 0-9 3-9 7v2h18v-2c0-4-4-7-9-7z" fill="#EFF6FF" />
            <path d="M14 19.5l2 3.5 2-3.5h-4z" fill="#2563EB" />
            <rect x="14.5" y="17.5" width="3" height="4" rx="1.5" fill="#FDBA74" />
            <circle cx="16" cy="13.5" r="5.5" fill="#FFD8A8" />
            <path d="M10.5 11c0-4.5 3-6.5 5.5-6.5s5.5 2 5.5 6.5c0 1-.5 1-1 .5s-1.5-2.5-4.5-2.5-4 2-4.5 2.5-.5.5-1-.5z" fill="#4B5563" />
            <rect x="12" y="12" width="3.5" height="2" rx="0.5" stroke="#111827" strokeWidth="0.75" />
            <rect x="16.5" y="12" width="3.5" height="2" rx="0.5" stroke="#111827" strokeWidth="0.75" />
            <line x1="15.5" y1="13" x2="16.5" y2="13" stroke="#111827" strokeWidth="0.75" />
            <path d="M14.5 16c.5.5 2.5.5 3 0" stroke="#111827" strokeWidth="0.75" strokeLinecap="round" />
          </svg>
        </div>
      );
    case 'Siddharth':
    case 'SV':
      return (
        <div className={`${size} rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 shadow-sm shrink-0 bg-gradient-to-tr from-amber-400 to-red-500 flex items-center justify-center`}>
          <svg className="w-full h-full" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 19c-5 0-9 3-9 7v2h18v-2c0-4-4-7-9-7z" fill="#FFF7ED" />
            <path d="M13.5 20.5h5v8h-5z" fill="#EA580C" />
            <rect x="14.5" y="17.5" width="3" height="4" rx="1.5" fill="#FDBA74" />
            <circle cx="16" cy="13.5" r="5.5" fill="#FDBA74" />
            <path d="M10.5 11c.5-3.5 3.5-5 5.5-5s5.5 1.5 5.5 5c0 .8-.5 1-1.5 0s-2-2-4-2-3 2-4.5 2.5-1-.3-1-.5z" fill="#78350F" />
            <circle cx="14.25" cy="13.5" r="0.75" fill="#111827" />
            <circle cx="17.75" cy="13.5" r="0.75" fill="#111827" />
            <path d="M14.5 15.5c.5.8 2.5.8 3 0" stroke="#111827" strokeWidth="0.75" strokeLinecap="round" />
          </svg>
        </div>
      );
    case 'Riya':
      return (
        <div className={`${size} rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 shadow-sm shrink-0 bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center`}>
          <svg className="w-full h-full" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 19c-5 0-9 3-9 7v2h18v-2c0-4-4-7-9-7z" fill="#ECFDF5" />
            <rect x="14.5" y="17.5" width="3" height="4" rx="1.5" fill="#FDBA74" />
            <circle cx="16" cy="14" r="5.5" fill="#FDBA74" />
            <path d="M11 9c.5-2.5 3-3.5 5-3.5s4.5 1 5 3.5c.5 2.5.5 6.5.5 8.5h-11c0-2 0-6 .5-8.5z" fill="#D97706" />
            <circle cx="14.25" cy="13.5" r="0.75" fill="#111827" />
            <circle cx="17.75" cy="13.5" r="0.75" fill="#111827" />
            <path d="M14.5 15.7c.4.6 2 .6 2.4 0" stroke="#111827" strokeWidth="0.75" strokeLinecap="round" />
          </svg>
        </div>
      );
    case 'Varun':
      return (
        <div className={`${size} rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 shadow-sm shrink-0 bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center`}>
          <svg className="w-full h-full" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 19c-5 0-9 3-9 7v2h18v-2c0-4-4-7-9-7z" fill="#FAF5FF" />
            <rect x="14.5" y="17.5" width="3" height="4" rx="1.5" fill="#FDBA74" />
            <circle cx="16" cy="13.5" r="5.5" fill="#FDBA74" />
            <path d="M10 11.5c0-4.5 3.5-5.5 6-5.5s6 1 6 5.5c0 1.5-.5 1-1.5 0s-2-2-4.5-2-3.5 2-4.5 2c-1 1-1.5.5-1.5-1z" fill="#111827" />
            <path d="M9.5 13.5c0-4 2.5-6.5 6.5-6.5s6.5 2.5 6.5 6.5" stroke="#3B82F6" strokeWidth="1.5" fill="none" />
            <rect x="9" y="12" width="2" height="3" rx="0.5" fill="#3B82F6" />
            <rect x="21" y="12" width="2" height="3" rx="0.5" fill="#3B82F6" />
            <circle cx="14.25" cy="13.5" r="0.75" fill="#111827" />
            <circle cx="17.75" cy="13.5" r="0.75" fill="#111827" />
            <path d="M14.5 15.5c.5.8 2.5.8 3 0" stroke="#111827" strokeWidth="0.75" strokeLinecap="round" />
          </svg>
        </div>
      );
    default:
      return (
        <div className={`${size} rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 bg-zinc-150 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-650 dark:text-zinc-350 shadow-sm shrink-0`}>
          {name}
        </div>
      );
  }
};

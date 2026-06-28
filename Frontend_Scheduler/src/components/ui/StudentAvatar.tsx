import React from 'react';

export const getStudentAvatar = (name: string, size: string = "w-8 h-8") => {
  const images: Record<string, string> = {
    Ananya: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
    AM: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
    Rohan: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
    RM: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
    Siddharth: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120",
    SV: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120",
    Riya: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120",
    Varun: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120"
  };

  const url = images[name];
  if (url) {
    return (
      <div className={`${size} rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 shadow-sm shrink-0`}>
        <img src={url} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  // Fallback initials avatar
  return (
    <div className={`${size} rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 bg-zinc-150 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-650 dark:text-zinc-350 shadow-sm shrink-0`}>
      {name.substring(0, 2).toUpperCase()}
    </div>
  );
};

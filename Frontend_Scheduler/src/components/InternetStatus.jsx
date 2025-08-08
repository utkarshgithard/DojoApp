import React, { useState, useEffect } from "react";
import { WifiOff } from "lucide-react"; // icon

const InternetStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Check connection status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    // Listen for network changes
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Update time every second
    const timer = setInterval(() => setTime(new Date()), 1000);

    // Cleanup
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      clearInterval(timer);
    };
  }, []);

  if (isOnline) return null; // Show only when offline

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] sm:w-[400px] flex items-center justify-between px-4 py-2 rounded-2xl 
      bg-white/10 backdrop-blur-md border border-white/20 shadow-lg text-black text-sm animate-slide-up">
      <div className="flex items-center justify-center gap-8">
        <WifiOff className="text-black" size={18} />
        <span className="font-medium">No Internet Connection</span>
      </div>
    </div>
  );
};

export default InternetStatus;

import { useState,useEffect } from "react";
export function SessionStatus({ session }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (session.status === "in_progress") {
      setTimeLeft("LIVE");
      return;
    }else{
        console.log("That means session is not being updatd in the backend")
    }

    if (session.status === "expired") {
      setTimeLeft("ENDED");
      return;
    }

    // Countdown for scheduled sessions
    const interval = setInterval(() => {
      const diff = new Date(session.startAt) - Date.now();
      if (diff <= 0) {
        setTimeLeft("LIVE");
        clearInterval(interval);
      } else {
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${minutes.toString().padStart(2,"0")}:${seconds.toString().padStart(2,"0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  return <span>{timeLeft}</span>;
}

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const SocketProvider = ({ token, children }) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    const s = io(import.meta.env.VITE_API_BASE_URL, {
      transports: ["websocket"],
      auth: { token }
    });
    socketRef.current = s;
    return () => { s.disconnect(); socketRef.current = null; };
  }, [token]);

  const value = useMemo(() => socketRef.current, [socketRef.current]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);

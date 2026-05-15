"use client";
import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";

// --- Types ---

interface Message {
  id: string;
  sessionId: string;
  userId: string;
  name: string;
  text: string;
  ts: string | Date;
}

interface Session {
  id: string;
  subject?: string;
  status?: string;
  startAt?: string;
}

interface TypingUsers {
  [userId: string]: string | undefined;
}

interface SessionChatProps {
  socket: Socket | null;
  session: Session | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SessionChat({ socket, session, isOpen, onClose }: SessionChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState<TypingUsers>({});
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Prisma returns `id`, never `_id`
  const sessionId = session?.id;

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  // Load messages and attach socket listeners
  useEffect(() => {
    if (!socket || !isOpen || !sessionId) return;

    // Request chat history on open
    socket.emit('getSessionMessages', { sessionId });

    const onHistory = (data: { sessionId: string; messages: Message[] }) => {
      if (data.sessionId === sessionId) {
        setMessages(data.messages || []);
        setTimeout(scrollToBottom, 0);
      }
    };

    const onNew = (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(scrollToBottom, 0);
    };

    const onTyping = (data: { userId: string; name: string; isTyping: boolean }) => {
      setTypingUsers(prev => ({
        ...prev,
        [data.userId]: data.isTyping ? data.name : undefined
      }));

      // Auto-clear typing indicator after 3s of silence
      clearTimeout(typingTimeouts.current[data.userId]);
      if (data.isTyping) {
        typingTimeouts.current[data.userId] = setTimeout(() => {
          setTypingUsers(prev => ({ ...prev, [data.userId]: undefined }));
        }, 3000);
      }
    };

    const onError = (e: { msg?: string }) => console.warn("chatError:", e?.msg);

    socket.on("sessionMessages", onHistory);
    socket.on("newChatMessage", onNew);
    socket.on("userTyping", onTyping);
    socket.on("chatError", onError);

    // Capture ref value for use in cleanup (ref.current may change by cleanup time)
    const timeouts = typingTimeouts.current;

    return () => {
      socket.off("sessionMessages", onHistory);
      socket.off("newChatMessage", onNew);
      socket.off("userTyping", onTyping);
      socket.off("chatError", onError);
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, [socket, isOpen, sessionId]);

  const disabled = !socket || session?.status !== "in_progress";

  const send = () => {
    if (!text.trim() || disabled || !socket) return;
    socket.emit("sendChatMessage", { sessionId, text });
    setText("");
    socket.emit("typing", { sessionId, isTyping: false });
  };

  const handleTyping = (val: string) => {
    setText(val);
    if (socket) {
      socket.emit("typing", { sessionId, isTyping: !!val });
    }
  };

  const typingNames = Object.values(typingUsers).filter(Boolean) as string[];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="font-semibold">
            {session?.subject}{" "}
            {session?.status === "in_progress" && (
              <span className="ml-2 inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                LIVE
                <span className="ml-1 w-2 h-2 rounded-full bg-green-600 animate-pulse" />
              </span>
            )}
            {session?.status === "scheduled" && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Starts at {session.startAt ? new Date(session.startAt).toLocaleTimeString() : '—'}
              </span>
            )}
            {session?.status === "expired" && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                Ended
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-sm px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            Close
          </button>
        </div>

        {/* Message List */}
        <div ref={listRef} className="h-72 overflow-y-auto rounded border dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((m, index) => (
              <div key={m.id || index} className="mb-2">
                <div className="text-xs text-gray-500">
                  {m.name} • {new Date(m.ts).toLocaleTimeString()}
                </div>
                <div className="text-sm">{m.text}</div>
              </div>
            ))
          )}
        </div>

        {/* Typing Indicator */}
        <div className="h-5 mt-1 text-xs text-gray-500">
          {typingNames.length > 0 && (
            <span>{typingNames.join(", ")} typing…</span>
          )}
        </div>

        {/* Input */}
        <div className="mt-2 flex gap-2">
          <input
            disabled={disabled}
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={disabled ? "Chat available when session is LIVE" : "Type a message…"}
            className="flex-1 border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 disabled:opacity-50"
          />
          <button
            disabled={disabled || !text.trim()}
            onClick={send}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

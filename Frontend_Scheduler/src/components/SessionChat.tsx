"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { Message, StudySession, TypingUsers, SessionChatProps } from "@/lib/types";
import { useDarkMode } from "@/context/DarkModeContext";
import { Send, X, MessageSquare } from "lucide-react";

export default function SessionChat({ socket, session, isOpen, onClose }: SessionChatProps) {
  const { darkMode } = useDarkMode() as any;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState<TypingUsers>({});
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const sessionId = session?.id;

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

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

  const dark = darkMode;
  const border = dark ? 'border-gray-800' : 'border-gray-200';
  const muted = dark ? 'text-gray-400' : 'text-gray-500';

  const inputClass = `flex-1 px-3.5 py-2 text-sm rounded-lg border outline-none transition-colors disabled:opacity-40
    ${dark
      ? 'bg-black border-gray-800 text-white placeholder-gray-700 focus:border-gray-600'
      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'
    }`;

  const primaryBtn = `px-4 py-2 rounded-lg text-[13px] font-medium transition-opacity hover:opacity-80 active:scale-95 flex items-center gap-1.5
    ${dark ? 'bg-white text-black' : 'bg-black text-white'}
    disabled:opacity-40`;

  const secondaryBtn = `px-3.5 py-1.5 rounded-lg text-[13px] font-medium border transition-colors
    ${dark
      ? 'border-gray-800 text-gray-200 hover:bg-gray-900'
      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
    } disabled:opacity-40`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-xl border rounded-xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
        dark ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b pb-3 border-gray-100 dark:border-gray-900">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className={muted} />
            <h3 className="font-medium text-[15px] tracking-tight">{session?.subject}</h3>
            {session?.status === "in_progress" && (
              <span className="ml-1 inline-flex items-center text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border border-green-500/20 text-green-500 bg-green-500/5">
                Live
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </span>
            )}
            {session?.status === "scheduled" && (
              <span className={`ml-1 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${border} ${muted}`}>
                Scheduled
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className={`text-[18px] leading-none transition-colors ${muted} hover:text-current`}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message List */}
        <div
          ref={listRef}
          className={`h-72 overflow-y-auto rounded-lg border p-3.5 mb-2.5 transition-colors ${
            dark ? 'bg-black border-gray-900 text-white' : 'bg-white border-gray-100 text-gray-900'
          }`}
        >
          {messages.length === 0 ? (
            <div className={`text-center ${muted} text-[13px] py-16`}>
              No messages yet. Say hello!
            </div>
          ) : (
            <div className="space-y-3.5">
              {messages.map((m, index) => (
                <div key={m.id || index} className="flex flex-col">
                  {/* Sender & Time */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-medium text-current">{m.name}</span>
                    <span className={`text-[9px] font-mono ${muted}`}>
                      {new Date(m.ts).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                  {/* Bubble content */}
                  <div className={`text-[13px] max-w-[90%] self-start px-3 py-2 rounded-lg border ${border} ${
                    dark ? 'bg-gray-950 text-gray-200' : 'bg-gray-50 text-gray-800'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Typing Indicator */}
        <div className="h-5 mb-2">
          {typingNames.length > 0 && (
            <span className={`text-[11px] font-medium ${muted} animate-pulse`}>
              {typingNames.join(", ")} {typingNames.length === 1 ? 'is' : 'are'} typing…
            </span>
          )}
        </div>

        {/* Send Input Group */}
        <div className="flex gap-2">
          <input
            disabled={disabled}
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={disabled ? "Chat is available when session is LIVE" : "Type a message…"}
            className={inputClass}
          />
          <button
            disabled={disabled || !text.trim()}
            onClick={send}
            className={primaryBtn}
            aria-label="Send message"
          >
            <span>Send</span>
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

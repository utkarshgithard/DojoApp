import { useEffect, useRef, useState } from "react";

export default function SessionChat({ socket, session, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const listRef = useRef(null);
  const typingTimeouts = useRef({});

  const sessionId = session?._id;
 

  // auto-scroll
  const scrollToBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // join/leave the room with lifecycle
  useEffect(() => {
    if (!socket || !isOpen || !sessionId) return;
    socket.emit("joinSessionRoom", { room: `session_${sessionId}`  });

    const onHistory = ({ sessionId: id, messages: msgs }) => {
      if (id === sessionId) {
        setMessages(msgs);
        setTimeout(scrollToBottom, 0);
      }
    };
    const onNew = (msg) => {
      console.log(msg)
      setMessages(prev => [...prev, msg]);
      setTimeout(scrollToBottom, 0);
    };
    const onTyping = ({ userId, name, isTyping }) => {
      setTypingUsers(prev => ({ ...prev, [userId]: isTyping ? name : undefined }));
      // clear typing indicator after 3s of inactivity per user
      clearTimeout(typingTimeouts.current[userId]);
      if (isTyping) {
        typingTimeouts.current[userId] = setTimeout(() => {
          setTypingUsers(prev => ({ ...prev, [userId]: undefined }));
        }, 3000);
      }
    };
    const onError = (e) => console.warn("chatError:", e?.msg);

    socket.on("sessionMessages", onHistory);
    socket.on("newChatMessage", onNew);
    socket.on("userTyping", onTyping);
    socket.on("chatError", onError);

    return () => {
      socket.emit("leaveSessionRoom", { sessionId });
      socket.off("sessionMessages", onHistory);
      socket.off("newChatMessage", onNew);
      socket.off("userTyping", onTyping);
      socket.off("chatError", onError);
      Object.values(typingTimeouts.current).forEach(clearTimeout);
    };
  }, [socket, isOpen, sessionId]);

  const disabled = session?.status !== "in_progress";

  const send = () => {
    if (!text.trim()) return;
    socket.emit("sendChatMessage", { sessionId, text });
    setText("");
    socket.emit("typing", { sessionId, isTyping: false });
  };

  const handleTyping = (val) => {
    setText(val);
    socket.emit("typing", { sessionId, isTyping: !!val });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xl">
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
                Starts at {new Date(session.startAt).toLocaleTimeString()}
              </span>
            )}
            {session?.status === "expired" && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                Ended
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-sm px-2 py-1 border rounded">
            Close
          </button>
        </div>

        <div ref={listRef} className="h-72 overflow-y-auto rounded border dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900">
          {messages.map(m => (
            <div key={m._id || m.ts} className="mb-2">
              <div className="text-xs text-gray-500">{m.name} • {new Date(m.ts).toLocaleTimeString()}</div>
              <div className="text-sm">{m.text}</div>
            </div>
          ))}
        </div>

        {/* typing indicator */}
        <div className="h-5 mt-1 text-xs text-gray-500">
          {Object.values(typingUsers).filter(Boolean).length > 0 && (
            <span>{Object.values(typingUsers).filter(Boolean).join(", ")} typing…</span>
          )}
        </div>

        <div className="mt-2 flex gap-2">
          <input
            disabled={disabled}
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={disabled ? "Chat available when session is LIVE" : "Type a message…"}
            className="flex-1 border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
          />
          <button
            disabled={disabled || !text.trim()}
            onClick={send}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

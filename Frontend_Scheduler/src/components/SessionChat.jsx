import React, { useState, useEffect, useRef } from 'react';
import { useDarkMode } from '../context/DarkModeContext';

const SessionChat = ({ sessionId, socket, isOpen, onClose, sessionDetails }) => {
  const { darkMode } = useDarkMode();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket || !sessionId) return;

    // Listen for new messages
    const handleNewMessage = (messageData) => {
      if (messageData.sessionId === sessionId) {
        setMessages(prev => [...prev, messageData]);
      }
    };

    socket.on('newChatMessage', handleNewMessage);

    // Load existing messages
    socket.emit('getSessionMessages', { sessionId });

    // Listen for session messages
    socket.on('sessionMessages', (data) => {
      if (data.sessionId === sessionId) {
        setMessages(data.messages);
      }
    });

    return () => {
      socket.off('newChatMessage', handleNewMessage);
      socket.off('sessionMessages');
    };
  }, [socket, sessionId]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    socket.emit('sendChatMessage', {
      sessionId: sessionId,
      message: newMessage.trim()
    });

    setNewMessage('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-2xl h-96 mx-4 rounded-lg shadow-xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
        {/* Chat Header */}
        <div className={`flex justify-between items-center p-4 border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          <div>
            <h3 className="text-lg font-semibold">Study Session Chat</h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {sessionDetails?.subject || 'Study Session'}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full hover:bg-opacity-80 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className={`flex-1 p-4 overflow-y-auto h-64 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          {messages.length === 0 ? (
            <p className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No messages yet. Start the conversation!
            </p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.userId === localStorage.getItem('userId') ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-lg ${
                    msg.userId === localStorage.getItem('userId')
                      ? 'bg-blue-500 text-white'
                      : darkMode ? 'bg-gray-600 text-white' : 'bg-white text-black border'
                  }`}>
                    <p className="text-sm font-medium mb-1">{msg.userName}</p>
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-2 ${
                      msg.userId === localStorage.getItem('userId') 
                        ? 'text-blue-100' 
                        : darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-black placeholder-gray-500'
              }`}
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionChat;
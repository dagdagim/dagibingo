import React, { useState, useEffect, useRef } from 'react';
import { socketService } from '../../services/socket';
import { useAuthStore } from '../../stores/authStore';
import { Send, Smile, MessageSquare, Flame, Sparkles } from 'lucide-react';

interface GameChatProps {
  gameId: string;
}

interface ChatMessage {
  id?: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  message: string;
  createdAt: string;
  isSystem?: boolean;
}

export const GameChat: React.FC<GameChatProps> = ({ gameId }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial welcome system message
    setMessages([
      {
        id: 'sys-welcome',
        userId: 'system',
        username: 'ARENA BOT',
        message: 'Welcome to the live chat! Cheer, react, and daub together! 🎉',
        createdAt: new Date().toISOString(),
        isSystem: true,
      },
    ]);

    const unsubscribe = socketService.onChatMessage((msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      unsubscribe();
    };
  }, [gameId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    socketService.sendChatMessage({ gameId, message: inputMessage.trim() });
    setInputMessage('');
  };

  const handleQuickEmoji = (emoji: string) => {
    socketService.sendChatMessage({ gameId, message: emoji });
  };

  const quickEmojis = ['🎉', '🔥', '🍀', '🏆', '💎', '🚀'];

  return (
    <div className="glass-panel-elevated rounded-3xl p-4 flex flex-col h-[520px] relative border border-arena-border shadow-card-elevated">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-arena-border mb-3 px-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-black font-display text-arena-text uppercase tracking-wider">
            Live Room Chat
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold text-emerald-500 font-mono">LIVE</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 px-1 scrollbar-thin">
        {messages.map((msg, idx) => {
          const isMe = msg.userId === user?.id;

          if (msg.isSystem) {
            return (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center text-xs text-indigo-600 dark:text-indigo-300 font-semibold"
              >
                {msg.message}
              </div>
            );
          }

          return (
            <div
              key={idx}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span
                  className={`text-[11px] font-bold font-display ${
                    isMe ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isMe ? 'You' : msg.username}
                </span>
                <span className="text-[9px] text-arena-subtle font-mono">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div
                className={`px-3.5 py-2 rounded-2xl text-xs max-w-[85%] break-words ${
                  isMe
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-xs shadow-md'
                    : 'bg-arena-surface text-arena-text border border-arena-border rounded-tl-xs shadow-sm'
                }`}
              >
                {msg.message}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emojis Bar */}
      <div className="flex items-center gap-1.5 py-2 px-1 border-t border-arena-border mt-2">
        {quickEmojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleQuickEmoji(emoji)}
            className="w-8 h-8 rounded-lg bg-arena-surface hover:bg-indigo-500/10 text-sm flex items-center justify-center transition-transform hover:scale-125 active:scale-95 border border-arena-border cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-1">
        <input
          type="text"
          placeholder="Type your message..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          maxLength={150}
          className="flex-1 bg-arena-surface border border-arena-border rounded-xl px-3.5 py-2.5 text-xs text-arena-text placeholder:text-arena-subtle focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim()}
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-arena-glow flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

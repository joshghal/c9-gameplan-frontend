'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Square, Trash2, Bot, User, Loader2, Wrench } from 'lucide-react';
import { useCoaching, type ChatMessage } from '@/hooks/useCoaching';
import { useSimulationStore } from '@/store/simulation';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mapName } = useSimulationStore();

  const {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    clearMessages,
  } = useCoaching({
    mapContext: mapName,
    teamContext: 'cloud9',
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Quick prompts
  const quickPrompts = [
    "What are C9's tendencies on this map?",
    "How should we defend A site?",
    "Analyze the current positioning",
    "What would C9 do here?",
  ];

  return (
    <div className={cn(
      "flex flex-col bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Coach Vision</h3>
            <p className="text-xs text-gray-400">AI Tactical Assistant</p>
          </div>
        </div>
        <button
          onClick={clearMessages}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Bot className="w-12 h-12 text-gray-500 mb-3" />
            <p className="text-sm text-gray-400 mb-4">
              Ask me about tactics, patterns, or positions
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-full border border-white/10 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about tactics..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stopStreaming}
              className="p-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "flex gap-3",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
        isUser
          ? "bg-gradient-to-br from-green-500 to-emerald-600"
          : "bg-gradient-to-br from-purple-500 to-blue-500"
      )}>
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 max-w-[85%]",
        isUser && "flex flex-col items-end"
      )}>
        {/* Tool calls indicator */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {message.toolCalls.map((tool, i) => (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full",
                  tool.status === 'complete'
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"
                )}
              >
                <Wrench className="w-3 h-3" />
                {tool.name}
                {tool.status === 'pending' && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
              </span>
            ))}
          </div>
        )}

        {/* Message bubble */}
        <div className={cn(
          "rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-blue-500/20 text-white rounded-tr-md"
            : "bg-white/5 text-gray-200 rounded-tl-md"
        )}>
          {message.content || (
            <span className="inline-flex items-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Thinking...
            </span>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-gray-500 mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
}

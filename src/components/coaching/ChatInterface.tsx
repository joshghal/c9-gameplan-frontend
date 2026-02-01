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
      "hud-panel hud-panel-purple flex flex-col overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center" style={{
            background: 'var(--neon-purple)',
            clipPath: 'var(--clip-corner-sm)',
          }}>
            <Bot className="w-3.5 h-3.5 text-black" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--neon-purple)' }}>Coach Vision</h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>AI Tactical Assistant</p>
          </div>
        </div>
        <button
          onClick={clearMessages}
          className="btn-tactical p-2"
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px] custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Bot className="w-12 h-12 mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Ask me about tactics, patterns, or positions
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="btn-tactical px-3 py-1.5 text-xs"
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
      <form onSubmit={handleSubmit} className="p-4" style={{ borderTop: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about tactics..."
            className="flex-1 px-4 py-2.5 text-sm focus:outline-none"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              clipPath: 'var(--clip-corner-sm)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-rajdhani)',
            }}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stopStreaming}
              className="btn-tactical-red p-2.5"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--c9-cyan)',
                clipPath: 'var(--clip-corner-sm)',
                color: '#000',
              }}
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
      <div className="w-7 h-7 flex items-center justify-center flex-shrink-0" style={{
        background: isUser ? 'var(--c9-cyan)' : 'var(--neon-purple)',
        clipPath: 'var(--clip-corner-sm)',
      }}>
        {isUser ? (
          <User className="w-3.5 h-3.5 text-black" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-black" />
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
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs"
                style={{
                  background: tool.status === 'complete' ? 'rgba(18,212,180,0.15)' : 'rgba(255,230,0,0.15)',
                  color: tool.status === 'complete' ? 'var(--val-teal)' : 'var(--neon-yellow)',
                  clipPath: 'var(--clip-corner-sm)',
                }}
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
        <div className="px-4 py-2.5 text-sm" style={{
          background: isUser ? 'rgba(0,174,239,0.12)' : 'var(--bg-elevated)',
          border: `1px solid ${isUser ? 'rgba(0,174,239,0.2)' : 'var(--border-default)'}`,
          clipPath: 'var(--clip-corner-sm)',
          color: 'var(--text-primary)',
        }}>
          {message.content || (
            <span className="inline-flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              Thinking...
            </span>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-share-tech-mono)' }}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
}

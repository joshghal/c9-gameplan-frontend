'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Square, Film, SkipForward, SkipBack, X, Send,
  MessageSquare, BarChart3, Bot, User, Loader2, Wrench, Crosshair,
} from 'lucide-react';
import { useCameraStore } from '@/store/camera';
import { useSimulationStore } from '@/store/simulation';
import { useNarrationTimeline, type NarrationMoment } from '@/hooks/useNarrationTimeline';
import { useCoaching, type ChatMessage } from '@/hooks/useCoaching';
import { MapCanvas } from './MapCanvas';
import { MonteCarloPanel } from './MonteCarloPanel';
import { ScoutingReportPanel } from '@/components/coaching/ScoutingReportPanel';
import { Markdown } from '@/components/ui/Markdown';
import { cn } from '@/lib/utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface Snapshot {
  id: string;
  time_ms: number;
  phase: string;
  label?: string;
  spike_planted: boolean;
  spike_site: string | null;
  player_count: { attack: number; defense: number };
  players?: Array<{
    player_id: string; team_id: string; side: string;
    x: number; y: number; is_alive: boolean; health: number;
    agent?: string; facing_angle?: number; has_spike?: boolean;
    weapon_name?: string; role?: string;
  }>;
  round_state?: Record<string, unknown> | null;
  player_knowledge?: Record<string, unknown> | null;
  decisions?: Record<string, unknown> | null;
}

interface CommandCenterProps {
  snapshots: Snapshot[];
  finalState: Record<string, unknown>;
}

type TabId = 'narration' | 'chat' | 'intel';

export function CommandCenter({ snapshots, finalState }: CommandCenterProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('narration');

  // Narration state
  const [moments, setMoments] = useState<NarrationMoment[]>([]);
  const [isNarrationLoading, setIsNarrationLoading] = useState(false);
  const [narrationError, setNarrationError] = useState<string | null>(null);

  // Stores
  const { setTheaterMode } = useCameraStore();
  const { mapName, attackTeamId, defenseTeamId, positions, setPositions, events } = useSimulationStore();
  const { buildTimeline, play, pause, stop, seekToMoment, currentMoment, isPlaying } = useNarrationTimeline(snapshots);
  const savedPositionsRef = useRef(positions);

  // Player name map — built BEFORE useCoaching so roster has real names
  const playerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of positions) {
      if (p.name) map[p.player_id] = p.name;
    }
    for (const snap of snapshots) {
      if (snap.players) {
        for (const p of snap.players) {
          if ((p as Record<string, unknown>).name && !map[p.player_id]) {
            map[p.player_id] = String((p as Record<string, unknown>).name);
          }
        }
      }
    }
    return map;
  }, [positions, snapshots]);

  // Chat
  const {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    clearMessages,
  } = useCoaching({
    mapContext: mapName,
    teamContext: 'cloud9',
    simulationContext: {
      snapshots: snapshots.map(s => ({ time_ms: s.time_ms, phase: s.phase, label: s.label, spike_planted: s.spike_planted, player_count: s.player_count })),
      final_state: finalState,
      map_name: mapName,
      attack_team: attackTeamId,
      defense_team: defenseTeamId,
      events: events.slice(0, 30),
      // Player roster — use playerNameMap to guarantee real names even if p.name is undefined
      player_roster: positions.map(p => ({ id: p.player_id, name: playerNameMap[p.player_id] || p.name || p.player_id, agent: p.agent, side: p.side, team: p.team_id })),
    },
  });
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const resolveNames = useCallback((text: string): string => {
    let resolved = text;
    for (const [id, name] of Object.entries(playerNameMap)) {
      resolved = resolved.replaceAll(id, name);
    }
    return resolved;
  }, []);

  // Smart action chips — auto-generated from simulation state
  const smartChips = useCallback(() => {
    const chips: Array<{ label: string; text: string; icon: string }> = [];
    const deadPlayers = positions.filter(p => !p.is_alive);
    const attackAlive = positions.filter(p => p.side === 'attack' && p.is_alive).length;
    const attackWon = attackAlive > 0 || (finalState.spike_planted as boolean);

    // What-if chips for dead players (max 3)
    for (const p of deadPlayers.slice(0, 3)) {
      const name = playerNameMap[p.player_id] || p.player_id;
      chips.push({
        label: `What if ${name} survived?`,
        text: `What if ${name} survived that duel? How would the round outcome change?`,
        icon: '🔄',
      });
    }

    // Outcome chip
    chips.push({
      label: `Why did ${attackWon ? 'attack' : 'defense'} win?`,
      text: `Break down why ${attackWon ? 'attack' : 'defense'} won this round. What were the key decisions and turning points?`,
      icon: '🎯',
    });

    // Opponent tendencies
    const opponentName = defenseTeamId || 'the opponent';
    chips.push({
      label: `${opponentName} tendencies`,
      text: `What are ${opponentName}'s tendencies on ${mapName || 'this map'}? How should we exploit their patterns?`,
      icon: '📋',
    });

    return chips;
  }, [positions, finalState, defenseTeamId, mapName]);

  // Close on Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isModalOpen]);

  // Start narration SSE
  const startNarration = useCallback(async () => {
    if (snapshots.length === 0) {
      setNarrationError('No key moments captured. Run a simulation first.');
      return;
    }

    setIsNarrationLoading(true);
    setNarrationError(null);
    const newMoments: NarrationMoment[] = [];

    try {
      const response = await fetch(`${API_BASE_URL}/coaching/narration/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'narration',
          snapshots,
          final_state: finalState,
          map_name: mapName,
          attack_team: attackTeamId,
          defense_team: defenseTeamId,
          player_roster: positions.map(p => ({ id: p.player_id, name: p.name, agent: p.agent, side: p.side, team: p.team_id })),
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'moment') {
              newMoments.push(event.data);
              setMoments([...newMoments]);
            } else if (event.type === 'done') {
              if (newMoments.length > 0) {
                buildTimeline(newMoments);
                play();
              }
            }
          } catch {
            // skip parse errors
          }
        }
      }
    } catch (err) {
      setNarrationError(err instanceof Error ? err.message : 'Failed to start narration');
    } finally {
      setIsNarrationLoading(false);
    }
  }, [snapshots, finalState, mapName, attackTeamId, defenseTeamId, buildTimeline, play]);

  // Open modal
  const handleOpen = useCallback(() => {
    setIsModalOpen(true);
    setTheaterMode(true);
    savedPositionsRef.current = useSimulationStore.getState().positions;
    // Start narration if we haven't yet
    if (moments.length === 0) {
      startNarration();
    }
  }, [setTheaterMode, moments.length, startNarration]);

  // Close modal
  const handleClose = useCallback(() => {
    stop();
    setTheaterMode(false);
    setIsModalOpen(false);
    if (savedPositionsRef.current.length > 0) {
      setPositions(savedPositionsRef.current);
    }
  }, [stop, setTheaterMode, setPositions]);

  // Chat submit
  const handleChatSubmit = useCallback(async (text?: string) => {
    const content = text || chatInput.trim();
    if (!content || isStreaming) return;
    setChatInput('');
    // Switch to chat tab when sending a message
    setActiveTab('chat');
    await sendMessage(content);
  }, [chatInput, isStreaming, sendMessage]);

  // Launch button
  if (!isModalOpen) {
    return (
      <button
        onClick={handleOpen}
        disabled={snapshots.length === 0}
        className="btn-c9 w-full flex items-center justify-center gap-2 py-3 px-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Crosshair className="w-5 h-5" />
        {moments.length > 0 ? 'Resume AI Analysis' : 'Watch AI Breakdown'}
      </button>
    );
  }

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
    { id: 'narration', label: 'Analysis', icon: <Film className="w-3.5 h-3.5" /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'intel', label: 'Intel', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  const modal = (
    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex"
          style={{ background: 'var(--bg-abyss)', backdropFilter: 'blur(4px)' }}
        >
          {/* Left: Map Canvas */}
          <div className="flex-1 flex items-center justify-center p-4 min-w-0 overflow-hidden">
            <MapCanvas
              width={Math.min(900, typeof window !== 'undefined' ? window.innerHeight - 40 : 700)}
              height={Math.min(900, typeof window !== 'undefined' ? window.innerHeight - 40 : 700)}
            />
          </div>

          {/* Right: Command Center Panel */}
          <div className="w-[400px] flex-shrink-0 flex flex-col overflow-hidden relative" style={{
            borderLeft: '1px solid var(--border-default)',
            background: 'rgba(6,8,13,0.92)',
            backdropFilter: 'blur(24px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
          }}>
            {/* Light leak */}
            <div className="light-leak" style={{ height: '200px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }} />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <div className="flex items-center gap-2">
                <Crosshair className="w-5 h-5" style={{ color: 'var(--c9-cyan)' }} />
                <span className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--c9-cyan)' }}>
                  Command Center
                </span>
              </div>
              <button onClick={handleClose} className="btn-tactical p-1.5" title="Close (ESC)">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="relative z-10 flex" style={{ borderBottom: '1px solid var(--border-default)' }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all"
                  style={{
                    fontFamily: 'var(--font-rajdhani)',
                    color: activeTab === tab.id ? 'var(--c9-cyan)' : 'var(--text-tertiary)',
                    borderBottom: activeTab === tab.id ? '2px solid var(--c9-cyan)' : '2px solid transparent',
                    background: activeTab === tab.id ? 'rgba(0,174,239,0.06)' : 'transparent',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.id === 'chat' && messages.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--c9-cyan)' }} />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="relative z-10 flex-1 min-h-0 overflow-hidden flex flex-col">
              {activeTab === 'narration' && (
                <NarrationTab
                  moments={moments}
                  currentMoment={currentMoment}
                  isPlaying={isPlaying}
                  isLoading={isNarrationLoading}
                  error={narrationError}
                  snapshots={snapshots}
                  resolveNames={resolveNames}
                  seekToMoment={seekToMoment}
                  play={play}
                  pause={pause}
                  handleClose={handleClose}
                />
              )}
              {activeTab === 'chat' && (
                <ChatTab
                  messages={messages}
                  isStreaming={isStreaming}
                  stopStreaming={stopStreaming}
                  clearMessages={clearMessages}
                  messagesEndRef={messagesEndRef}
                  smartChips={smartChips()}
                  onChipClick={(text) => handleChatSubmit(text)}
                  resolveNames={resolveNames}
                />
              )}
              {activeTab === 'intel' && (
                <IntelTab
                  defenseTeamId={defenseTeamId}
                  mapName={mapName}
                />
              )}
            </div>

            {/* Always-visible chat input */}
            <div className="relative z-10" style={{ borderTop: '1px solid var(--border-default)' }}>
              <form
                onSubmit={(e) => { e.preventDefault(); handleChatSubmit(); }}
                className="flex items-center gap-2 px-4 py-3"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSubmit();
                    }
                  }}
                  placeholder="Ask anything about this round..."
                  className="flex-1 px-3 py-2 text-sm focus:outline-none"
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
                  <button type="button" onClick={stopStreaming} className="p-2" style={{
                    background: 'rgba(255,70,84,0.2)',
                    border: '1px solid rgba(255,70,84,0.4)',
                    clipPath: 'var(--clip-corner-sm)',
                    color: 'var(--val-red)',
                  }}>
                    <Square className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="p-2 transition-all disabled:opacity-30"
                    style={{
                      background: 'var(--c9-cyan)',
                      clipPath: 'var(--clip-corner-sm)',
                      color: '#000',
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </form>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof window !== 'undefined' ? createPortal(modal, document.body) : null;
}

// ─── Narration Tab ───────────────────────────────────────────────────────────

function NarrationTab({
  moments, currentMoment, isPlaying, isLoading, error, snapshots,
  resolveNames, seekToMoment, play, pause, handleClose,
}: {
  moments: NarrationMoment[];
  currentMoment: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  snapshots: Snapshot[];
  resolveNames: (text: string) => string;
  seekToMoment: (i: number) => void;
  play: () => void;
  pause: () => void;
  handleClose: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Current narration */}
      <div className="px-5 py-4 min-h-[120px]" style={{ borderBottom: '1px solid var(--border-default)' }}>
        {currentMoment >= 0 && moments[currentMoment] ? (
          <motion.div key={currentMoment} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <span className="data-readout text-xs" style={{ color: 'var(--c9-cyan)' }}>
              [{snapshots[currentMoment]?.time_ms ?? 0}ms]
            </span>
            <div className="mt-2">
              <Markdown>{resolveNames(moments[currentMoment].narration)}</Markdown>
            </div>
          </motion.div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-4">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
              <Film className="w-6 h-6" style={{ color: 'var(--c9-cyan)' }} />
            </motion.div>
            <div className="text-sm font-medium" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--c9-cyan)' }}>
              Analyzing round...
            </div>
            <div className="w-full space-y-2 mt-1">
              {[1, 0.75, 0.5].map((w, i) => (
                <motion.div
                  key={i}
                  className="h-2.5 rounded-sm"
                  style={{ background: 'var(--bg-elevated)', width: `${w * 100}%` }}
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm italic" style={{ color: 'var(--text-tertiary)' }}>Ready</div>
        )}
      </div>

      {/* Moment dots */}
      {moments.length > 0 && (
        <div className="flex gap-1.5 px-5 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          {moments.map((_, i) => (
            <button
              key={i}
              onClick={() => seekToMoment(i)}
              className="h-2 flex-1 transition-colors cursor-pointer hover:opacity-80"
              style={{
                background: i === currentMoment ? 'var(--c9-cyan)' : i < currentMoment ? 'rgba(0,174,239,0.4)' : 'var(--bg-elevated)',
                clipPath: 'var(--clip-corner-sm)',
                boxShadow: i === currentMoment ? '0 0 8px rgba(0,174,239,0.4)' : 'none',
              }}
              title={`Moment ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Controls */}
      {moments.length > 0 && (
        <div className="flex items-center justify-center gap-3 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <button onClick={handleClose} className="btn-tactical p-2" title="Stop"><Square className="w-4 h-4" /></button>
          <button onClick={() => seekToMoment(Math.max(currentMoment - 1, 0))} disabled={currentMoment <= 0} className="btn-tactical p-2 disabled:opacity-30" title="Previous"><SkipBack className="w-4 h-4" /></button>
          <button onClick={isPlaying ? pause : play} className="p-3" style={{ background: 'var(--c9-cyan)', clipPath: 'var(--clip-corner-sm)', color: '#000' }}>
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button onClick={() => seekToMoment(Math.min(currentMoment + 1, moments.length - 1))} disabled={currentMoment >= moments.length - 1} className="btn-tactical p-2 disabled:opacity-30" title="Next"><SkipForward className="w-4 h-4" /></button>
        </div>
      )}

      {/* All moments list */}
      <div className="flex-1 overflow-y-auto px-5 py-3 custom-scrollbar">
        <div className="text-xs uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-tertiary)' }}>All Moments</div>
        <div className="space-y-2">
          {moments.map((m, i) => (
            <button
              key={i}
              onClick={() => seekToMoment(i)}
              className="w-full text-left p-3 transition-all text-sm flex items-start overflow-hidden"
              style={{
                background: i === currentMoment ? 'rgba(0,174,239,0.12)' : 'var(--bg-elevated)',
                border: `1px solid ${i === currentMoment ? 'rgba(0,174,239,0.3)' : 'transparent'}`,
                clipPath: 'var(--clip-corner-sm)',
                color: i === currentMoment ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <span className="data-readout text-xs mr-1 flex-shrink-0" style={{ color: 'var(--c9-cyan)' }}>{i + 1}.</span>
              <Markdown className="line-clamp-3 [&_p]:my-0 [&_h1]:mt-0 [&_h2]:mt-0 [&_h3]:mt-0 [&_ul]:my-0 [&_ol]:my-0">{resolveNames(m.narration)}</Markdown>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="px-5 py-3 text-xs text-center" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--val-red)' }}>{error}</div>
      )}
    </div>
  );
}

// ─── Chat Tab ────────────────────────────────────────────────────────────────

function ChatTab({
  messages, isStreaming, stopStreaming, clearMessages, messagesEndRef,
  smartChips, onChipClick, resolveNames,
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
  stopStreaming: () => void;
  clearMessages: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  smartChips: Array<{ label: string; text: string; icon: string }>;
  onChipClick: (text: string) => void;
  resolveNames: (text: string) => string;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <Bot className="w-10 h-10 mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm mb-1 font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
              AI Tactical Coach
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
              Ask about this round, explore what-ifs, or get tactical insights
            </p>
            {/* Smart chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              {smartChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => onChipClick(chip.text)}
                  className="px-3 py-1.5 text-xs transition-all hover:brightness-125"
                  style={{
                    background: 'rgba(0,174,239,0.08)',
                    border: '1px solid rgba(0,174,239,0.2)',
                    clipPath: 'var(--clip-corner-sm)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-rajdhani)',
                  }}
                >
                  <span className="mr-1">{chip.icon}</span>
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} resolveNames={resolveNames} />
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

const TOOL_LABELS: Record<string, string> = {
  get_team_patterns: 'Analyzing patterns',
  get_position_heatmap: 'Reading heatmap',
  get_trade_patterns: 'Checking trades',
  get_economy_patterns: 'Reviewing economy',
  run_what_if: 'Running what-if sim',
};

function MessageBubble({ message, resolveNames }: { message: ChatMessage; resolveNames?: (text: string) => string }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('flex gap-3', isUser && 'flex-row-reverse')}
    >
      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{
        background: isUser ? 'var(--c9-cyan)' : 'rgba(0,174,239,0.2)',
        clipPath: 'var(--clip-corner-sm)',
      }}>
        {isUser ? <User className="w-3 h-3 text-black" /> : <Bot className="w-3 h-3" style={{ color: 'var(--c9-cyan)' }} />}
      </div>
      <div className={cn('flex-1 max-w-[85%]', isUser && 'flex flex-col items-end')}>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {/* Deduplicate tool calls by name — show each tool only once */}
            {[...new Map(message.toolCalls.map(t => [t.name, t])).values()].map((tool, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px]" style={{
                background: tool.status === 'complete' ? 'rgba(18,212,180,0.15)' : 'rgba(255,230,0,0.15)',
                color: tool.status === 'complete' ? 'var(--val-teal)' : 'var(--neon-yellow)',
                clipPath: 'var(--clip-corner-sm)',
              }}>
                <Wrench className="w-2.5 h-2.5" />
                {TOOL_LABELS[tool.name] || tool.name}
                {tool.status === 'pending' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
              </span>
            ))}
          </div>
        )}
        <div className="px-3 py-2 text-sm" style={{
          background: isUser ? 'rgba(0,174,239,0.12)' : 'var(--bg-elevated)',
          border: `1px solid ${isUser ? 'rgba(0,174,239,0.2)' : 'var(--border-default)'}`,
          clipPath: 'var(--clip-corner-sm)',
          color: 'var(--text-primary)',
        }}>
          {message.content ? (
            <Markdown>{resolveNames ? resolveNames(message.content) : message.content}</Markdown>
          ) : (
            <span className="inline-flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              Thinking...
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Intel Tab ───────────────────────────────────────────────────────────────

function IntelTab({ defenseTeamId, mapName }: { defenseTeamId: string; mapName: string }) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
      {/* Monte Carlo */}
      <MonteCarloPanel />

      {/* Scouting Report */}
      <ScoutingReportPanel
        teamName={defenseTeamId || 'g2'}
        mapName={mapName}
      />
    </div>
  );
}

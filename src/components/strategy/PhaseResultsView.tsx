'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, Skull, Swords, Shield, Trophy, Play, Pause, Bot, Loader2,
  MessageSquare, Send, Square, User, Wrench,
} from 'lucide-react';
import { useStrategyStore, PHASES, PHASE_LABELS } from '@/store/strategy';
import { streamNarration, type NarrationMoment, type PhaseResult, type StrategySnapshot } from '@/lib/strategy-api';

const MAP_DATA: Record<string, {
  sites: Record<string, { center: [number, number]; radius: number }>;
}> = {
  ascent: { sites: { A: { center: [0.29, 0.15], radius: 0.08 }, B: { center: [0.27, 0.79], radius: 0.08 } } },
  bind: { sites: { A: { center: [0.29, 0.27], radius: 0.08 }, B: { center: [0.73, 0.33], radius: 0.08 } } },
  split: { sites: { A: { center: [0.33, 0.09], radius: 0.08 }, B: { center: [0.32, 0.82], radius: 0.08 } } },
  icebox: { sites: { A: { center: [0.61, 0.21], radius: 0.08 }, B: { center: [0.71, 0.81], radius: 0.10 } } },
  breeze: { sites: { A: { center: [0.15, 0.29], radius: 0.09 }, B: { center: [0.87, 0.45], radius: 0.08 } } },
  fracture: { sites: { A: { center: [0.08, 0.45], radius: 0.08 }, B: { center: [0.92, 0.45], radius: 0.08 } } },
  pearl: { sites: { A: { center: [0.18, 0.40], radius: 0.08 }, B: { center: [0.85, 0.31], radius: 0.08 } } },
  sunset: { sites: { A: { center: [0.08, 0.40], radius: 0.08 }, B: { center: [0.82, 0.38], radius: 0.08 } } },
  abyss: { sites: { A: { center: [0.40, 0.19], radius: 0.08 }, B: { center: [0.40, 0.77], radius: 0.08 } } },
  corrode: { sites: { A: { center: [0.40, 0.19], radius: 0.08 }, B: { center: [0.40, 0.77], radius: 0.08 } } },
  haven: { sites: { A: { center: [0.38, 0.14], radius: 0.07 }, B: { center: [0.40, 0.50], radius: 0.07 }, C: { center: [0.36, 0.84], radius: 0.07 } } },
  lotus: { sites: { A: { center: [0.10, 0.45], radius: 0.07 }, B: { center: [0.47, 0.42], radius: 0.07 }, C: { center: [0.87, 0.32], radius: 0.07 } } },
};

const SIDE_COLORS = { attack: '#ff4654', defense: '#12d4b4' };
const PLAYER_COLORS = ['#ff4654', '#ffe600', '#12d4b4', '#00AEEF', '#b967ff'];

type RightTab = 'narration' | 'events' | 'chat';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  toolCalls?: Array<{ name: string; status: 'pending' | 'complete' }>;
}

export function PhaseResultsView() {
  const { round, activePhase, phaseResults, planNextPhase, setPageState, executedPhases } = useStrategyStore();
  const [mapSize, setMapSize] = useState(600);

  // Snapshot playback
  const [snapIdx, setSnapIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackDone, setPlaybackDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Narration
  const [moments, setMoments] = useState<NarrationMoment[]>([]);
  const [narrationLoading, setNarrationLoading] = useState(false);
  const [activeMomentIdx, setActiveMomentIdx] = useState(-1);
  const [rightTab, setRightTab] = useState<RightTab>('narration');
  const narrationContainerRef = useRef<HTMLDivElement>(null);

  // Camera focus from narration
  const [cameraFocus, setCameraFocus] = useState<{ x: number; y: number; zoom: number } | null>(null);

  const result: PhaseResult | undefined = phaseResults[activePhase];

  useEffect(() => {
    const update = () => {
      const h = window.innerHeight - 180;
      setMapSize(Math.min(800, Math.max(400, h)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Auto-play snapshots
  useEffect(() => {
    if (!isPlaying || !result || result.snapshots.length === 0) return;
    timerRef.current = setInterval(() => {
      setSnapIdx((prev) => {
        if (prev >= result.snapshots.length - 1) {
          setIsPlaying(false);
          setPlaybackDone(true);
          return prev;
        }
        return prev + 1;
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, result]);

  // Reset playback when phase changes
  useEffect(() => {
    setSnapIdx(0);
    setIsPlaying(true);
    setPlaybackDone(false);
    setMoments([]);
    setActiveMomentIdx(-1);
    setCameraFocus(null);
  }, [activePhase]);

  // Fetch narration when result loads
  useEffect(() => {
    if (!result || !round || moments.length > 0 || narrationLoading) return;
    setNarrationLoading(true);

    // Build roster from end positions
    const roster = result.end_positions.map((p) => ({
      id: p.player_id,
      name: p.name,
      agent: p.agent,
      side: p.side,
      team: p.side === round.user_side ? 'Cloud9' : 'Opponent',
    }));

    const finalState = {
      winner: result.winner,
      round_ended: result.round_ended,
      phase: result.phase_name,
      kills: result.events.filter((e) => e.event_type === 'kill').length,
    };

    streamNarration(
      result.snapshots,
      finalState,
      {
        mapName: round.map_name,
        attackTeam: round.user_side === 'attack' ? 'Cloud9' : 'Opponent',
        defenseTeam: round.user_side === 'defense' ? 'Cloud9' : 'Opponent',
        playerRoster: roster,
      },
      (moment) => {
        setMoments((prev) => [...prev, moment]);
      },
      () => {
        setNarrationLoading(false);
      },
      () => {
        setNarrationLoading(false);
      },
    );
  }, [result, round, moments.length, narrationLoading]);

  // Auto-scroll narration
  useEffect(() => {
    if (narrationContainerRef.current && moments.length > 0) {
      narrationContainerRef.current.scrollTop = narrationContainerRef.current.scrollHeight;
    }
  }, [moments.length]);

  // Click on a narration moment → focus camera + jump to nearest snapshot
  const focusMoment = useCallback((moment: NarrationMoment, idx: number) => {
    setActiveMomentIdx(idx);
    setCameraFocus({ x: moment.focus_x, y: moment.focus_y, zoom: moment.zoom });
    // Jump to corresponding snapshot
    if (result && result.snapshots.length > 0) {
      const targetIdx = Math.min(idx, result.snapshots.length - 1);
      setSnapIdx(targetIdx);
      setIsPlaying(false);
    }
  }, [result]);

  // ─── Chat state ─────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const chatAbortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = useCallback(async (content: string) => {
    if (!content.trim() || !result || !round) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content };
    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', isStreaming: true };
    setChatMessages((prev) => [...prev, userMsg, assistantMsg]);
    setChatInput('');
    setIsChatStreaming(true);
    chatAbortRef.current = new AbortController();

    try {
      const resp = await fetch(`${API_BASE_URL}/coaching/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          map_context: round.map_name,
          team_context: 'cloud9',
          use_tools: true,
          simulation_context: {
            snapshots: result.snapshots.slice(0, 20).map((s) => ({ time_ms: s.time_ms, phase: s.phase })),
            final_state: { winner: result.winner, round_ended: result.round_ended },
            map_name: round.map_name,
            attack_team: round.user_side === 'attack' ? 'Your Team' : 'Opponent',
            defense_team: round.user_side === 'defense' ? 'Your Team' : 'Opponent',
            events: result.events.slice(0, 30),
            player_roster: result.end_positions.map((p) => ({
              id: p.player_id, name: p.name, agent: p.agent, side: p.side,
            })),
            current_moment_index: activeMomentIdx >= 0 ? activeMomentIdx : snapIdx,
            current_narration: activeMomentIdx >= 0 && moments[activeMomentIdx] ? moments[activeMomentIdx].narration : '',
          },
        }),
        signal: chatAbortRef.current.signal,
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => `HTTP ${resp.status}`);
        setChatMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${errText}`, isStreaming: false } : m));
        return;
      }
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      const toolCalls: ChatMessage['toolCalls'] = [];
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              fullContent += data.data;
              setChatMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullContent } : m));
            } else if (data.type === 'tool_start') {
              toolCalls.push({ name: data.tool_name, status: 'pending' });
              setChatMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, toolCalls: [...toolCalls] } : m));
            } else if (data.type === 'tool_result') {
              const idx = toolCalls.findIndex((t) => t.name === data.tool_name && t.status === 'pending');
              if (idx >= 0) toolCalls[idx].status = 'complete';
              setChatMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, toolCalls: [...toolCalls] } : m));
            } else if (data.type === 'done') {
              setChatMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m));
            } else if (data.type === 'error') {
              fullContent += `\n\nError: ${data.data || 'Unknown error'}`;
              setChatMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullContent, isStreaming: false } : m));
            }
          } catch { /* skip */ }
        }
      }
      setChatMessages((prev) => prev.map((m) => m.id === assistantId && m.isStreaming ? { ...m, isStreaming: false } : m));
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setChatMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${(err as Error).message}`, isStreaming: false } : m));
      }
    } finally {
      setIsChatStreaming(false);
      chatAbortRef.current = null;
    }
  }, [result, round, activeMomentIdx, moments, snapIdx]);

  const askWhatIf = useCallback((question: string) => {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setRightTab('chat');
    sendChat(question);
  }, [sendChat]);

  if (!result || !round) return null;

  const mapData = MAP_DATA[round.map_name.toLowerCase()];
  const phaseIdx = PHASES.indexOf(activePhase);
  const isLastPhase = phaseIdx >= PHASES.length - 1;

  const hasSnapshots = result.snapshots.length > 0;
  const currentSnap: StrategySnapshot | null = hasSnapshots ? result.snapshots[snapIdx] : null;
  const displayPlayers = currentSnap?.players ?? result.end_positions.map((p) => ({
    player_id: p.player_id,
    x: p.x,
    y: p.y,
    side: p.side,
    is_alive: p.is_alive,
    name: p.name,
    health: p.health,
    agent: p.agent,
    facing_angle: undefined as number | undefined,
    has_spike: p.has_spike,
  }));

  const currentTimeMs = currentSnap?.time_ms ?? 0;
  const userAlive = displayPlayers.filter((p) => p.side === round.user_side && p.is_alive).length;
  const oppAlive = displayPlayers.filter((p) => p.side !== round.user_side && p.is_alive).length;
  const visibleEvents = result.events.filter((e) => e.time_ms <= currentTimeMs);
  const kills = result.events.filter((e) => e.event_type === 'kill');

  // Build per-player color map: user teammates get PLAYER_COLORS, opponents get side color
  const userTeammates = round.teammates.map((t) => t.player_id);
  const getPlayerColor = (playerId: string, side: string) => {
    const tmIdx = userTeammates.indexOf(playerId);
    if (tmIdx >= 0) return PLAYER_COLORS[tmIdx % PLAYER_COLORS.length];
    return side === round.user_side ? SIDE_COLORS.attack : SIDE_COLORS.defense;
  };

  // Build movement trails from snapshots up to current index
  const playerTrails: Record<string, Array<{ x: number; y: number }>> = {};
  for (let i = 0; i <= snapIdx && i < result.snapshots.length; i++) {
    for (const p of result.snapshots[i].players) {
      if (!playerTrails[p.player_id]) playerTrails[p.player_id] = [];
      const trail = playerTrails[p.player_id];
      // Only add if position changed (avoid duplicates)
      const last = trail[trail.length - 1];
      if (!last || Math.abs(last.x - p.x) > 0.001 || Math.abs(last.y - p.y) > 0.001) {
        trail.push({ x: p.x, y: p.y });
      }
    }
  }

  // Camera transform for narration focus
  const mapTransform = cameraFocus
    ? `scale(${cameraFocus.zoom}) translate(${(0.5 - cameraFocus.x) * 100 / cameraFocus.zoom}%, ${(0.5 - cameraFocus.y) * 100 / cameraFocus.zoom}%)`
    : undefined;

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-abyss)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3" style={{
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-default)',
      }}>
        <div className="text-sm font-semibold uppercase tracking-wider" style={{
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-rajdhani)',
        }}>
          Phase Results — {PHASE_LABELS[activePhase]}
        </div>
        <div className="flex items-center gap-2">
          {PHASES.map((phase, idx) => {
            const isCompleted = executedPhases.includes(phase);
            const isCurrent = phase === activePhase;
            return (
              <div key={phase} className="flex items-center gap-1">
                {idx > 0 && <div className="w-4 h-px" style={{ background: isCompleted ? 'var(--c9-blue)' : 'var(--border-default)' }} />}
                <div className="w-2.5 h-2.5 rounded-full" style={{
                  background: isCompleted ? 'var(--c9-blue)' : 'var(--bg-elevated)',
                  border: isCurrent ? '2px solid var(--c9-blue)' : 'none',
                }} />
              </div>
            );
          })}
        </div>
        <span className="text-sm capitalize" style={{
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-rajdhani)',
        }}>
          {round.map_name} ({round.user_side})
        </span>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div
            className="relative overflow-hidden"
            style={{
              width: mapSize,
              height: mapSize,
              background: 'var(--bg-primary)',
              clipPath: 'var(--clip-corner)',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                transform: mapTransform,
                transformOrigin: 'center center',
                transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <img
                src={`/maps/${round.map_name.toLowerCase()}.png`}
                alt={round.map_name}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ filter: 'brightness(0.7)' }}
              />

              {/* Sites */}
              {mapData && Object.entries(mapData.sites).map(([name, site]) => (
                <div
                  key={name}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: `${site.center[0] * 100}%`,
                    top: `${site.center[1] * 100}%`,
                    width: `${site.radius * 2 * 100}%`,
                    height: `${site.radius * 2 * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    border: '2px solid rgba(255,230,0,0.3)',
                    borderRadius: '50%',
                  }}
                >
                  <span className="text-xs font-bold" style={{ color: 'rgba(255,230,0,0.6)' }}>{name}</span>
                </div>
              ))}

              {/* Movement trails + FOV Cones */}
              <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" viewBox={`0 0 ${mapSize} ${mapSize}`} style={{ zIndex: 5 }}>
                {/* Trails */}
                {Object.entries(playerTrails).map(([playerId, trail]) => {
                  if (trail.length < 2) return null;
                  const dp = displayPlayers.find((p) => p.player_id === playerId);
                  const color = getPlayerColor(playerId, dp?.side ?? '');
                  const isUser = dp?.side === round.user_side;
                  return (
                    <polyline
                      key={`trail-${playerId}`}
                      points={trail.map((pt) => `${pt.x * mapSize},${pt.y * mapSize}`).join(' ')}
                      fill="none"
                      stroke={color}
                      strokeWidth={isUser ? 1.2 : 0.7}
                      strokeOpacity={isUser ? 0.45 : 0.18}
                      strokeDasharray={isUser ? 'none' : '3,3'}
                    />
                  );
                })}
                {/* FOV Cones */}
                {displayPlayers.map((p) => {
                  if (!p.is_alive || p.facing_angle == null) return null;
                  const px = p.x * mapSize;
                  const py = p.y * mapSize;
                  const coneLength = mapSize * 0.06;
                  const fovHalf = Math.PI / 4;
                  const leftAngle = p.facing_angle - fovHalf;
                  const rightAngle = p.facing_angle + fovHalf;
                  const color = getPlayerColor(p.player_id, p.side);
                  return (
                    <polygon
                      key={`fov-${p.player_id}`}
                      points={`${px},${py} ${px + Math.cos(leftAngle) * coneLength},${py + Math.sin(leftAngle) * coneLength} ${px + Math.cos(rightAngle) * coneLength},${py + Math.sin(rightAngle) * coneLength}`}
                      fill={`${color}20`}
                      stroke={`${color}50`}
                      strokeWidth="1"
                    />
                  );
                })}
              </svg>

              {/* Players */}
              {displayPlayers.map((p) => {
                const isUser = p.side === round.user_side;
                const color = getPlayerColor(p.player_id, p.side);
                return (
                  <motion.div
                    key={p.player_id}
                    className="absolute"
                    animate={{
                      left: `${p.x * 100}%`,
                      top: `${p.y * 100}%`,
                      opacity: p.is_alive ? 1 : 0.3,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    style={{
                      transform: 'translate(-50%, -50%)',
                      zIndex: isUser ? 10 : 5,
                    }}
                  >
                    <div
                      className="w-5 h-5"
                      style={{
                        backgroundColor: p.is_alive ? color : 'var(--bg-elevated)',
                        border: `2px solid ${isUser ? 'white' : 'rgba(255,255,255,0.4)'}`,
                        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                        boxShadow: isUser ? `0 0 6px ${color}88` : 'none',
                      }}
                    />
                    {/* Spike carrier badge */}
                    {p.has_spike && p.is_alive && (
                      <div className="absolute -top-2 -right-2 text-[8px] font-bold leading-none"
                        style={{ color: '#ffe600', textShadow: '0 0 4px rgba(0,0,0,0.9)' }}>
                        ⬡
                      </div>
                    )}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap font-semibold" style={{
                      color: isUser ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      fontFamily: 'var(--font-share-tech-mono)',
                      textShadow: '0 0 4px rgba(0,0,0,0.9)',
                    }}>
                      {p.name}
                    </div>
                  </motion.div>
                );
              })}

              {/* Dropped spike indicator */}
              {currentSnap && !currentSnap.spike_planted &&
                currentSnap.dropped_spike_x != null && currentSnap.dropped_spike_y != null && (
                <motion.div
                  className="absolute pointer-events-none"
                  animate={{
                    left: `${currentSnap.dropped_spike_x * 100}%`,
                    top: `${currentSnap.dropped_spike_y * 100}%`,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  style={{ transform: 'translate(-50%, -50%)', zIndex: 20 }}
                >
                  <div className="text-sm animate-pulse" style={{
                    color: '#ffe600',
                    textShadow: '0 0 8px rgba(255,230,0,0.6)',
                    filter: 'drop-shadow(0 0 4px rgba(255,230,0,0.4))',
                  }}>⬡</div>
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 text-[8px] uppercase font-bold whitespace-nowrap"
                    style={{ color: '#ffe600', fontFamily: 'var(--font-rajdhani)', textShadow: '0 0 4px rgba(0,0,0,0.9)' }}>
                    Dropped
                  </div>
                </motion.div>
              )}

              {/* Planted spike indicator */}
              {currentSnap?.spike_planted && currentSnap.spike_site && mapData?.sites[currentSnap.spike_site] && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${mapData.sites[currentSnap.spike_site].center[0] * 100}%`,
                    top: `${mapData.sites[currentSnap.spike_site].center[1] * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 20,
                  }}
                >
                  <div className="text-lg animate-pulse" style={{
                    color: '#ff6b00',
                    textShadow: '0 0 12px rgba(255,107,0,0.8)',
                  }}>⬡</div>
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[8px] uppercase font-bold whitespace-nowrap tracking-wider"
                    style={{ color: '#ff6b00', fontFamily: 'var(--font-rajdhani)', textShadow: '0 0 4px rgba(0,0,0,0.9)' }}>
                    Planted
                  </div>
                </div>
              )}
            </div>

            {/* Alive count overlay (outside transform) */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-4 text-sm pointer-events-none z-10">
              <div className="flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5" style={{ color: 'var(--val-red)' }} />
                <span className="data-readout" style={{
                  color: round.user_side === 'attack' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontWeight: round.user_side === 'attack' ? 700 : 400,
                }}>
                  {round.user_side === 'attack' ? userAlive : oppAlive}
                </span>
              </div>
              <span style={{ color: 'var(--text-tertiary)' }}>vs</span>
              <div className="flex items-center gap-1.5">
                <span className="data-readout" style={{
                  color: round.user_side === 'defense' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontWeight: round.user_side === 'defense' ? 700 : 400,
                }}>
                  {round.user_side === 'defense' ? userAlive : oppAlive}
                </span>
                <Shield className="w-3.5 h-3.5" style={{ color: 'var(--val-teal)' }} />
              </div>
            </div>

            {/* Time + controls (outside transform) */}
            <div className="absolute bottom-3 left-3 text-xs data-readout z-10" style={{ color: 'var(--text-tertiary)' }}>
              {(currentTimeMs / 1000).toFixed(0)}s
            </div>
            {hasSnapshots && (
              <button
                onClick={() => {
                  if (playbackDone) {
                    setSnapIdx(0);
                    setPlaybackDone(false);
                    setIsPlaying(true);
                    setCameraFocus(null);
                  } else {
                    setIsPlaying(!isPlaying);
                  }
                }}
                className="absolute bottom-3 right-3 p-1.5 rounded-sm z-10"
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Active narration text overlay */}
            {activeMomentIdx >= 0 && moments[activeMomentIdx] && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-12 left-3 right-3 z-10 p-3"
                style={{
                  background: 'rgba(0,0,0,0.85)',
                  border: '1px solid var(--border-default)',
                  borderLeft: '3px solid var(--c9-blue)',
                }}
              >
                <div className="text-xs leading-relaxed" style={{
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-rajdhani)',
                }}>
                  {moments[activeMomentIdx].narration}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-[320px] flex-shrink-0 flex flex-col overflow-hidden" style={{ borderLeft: '1px solid var(--border-default)' }}>
          {/* Tab switcher */}
          <div className="flex" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <button
              onClick={() => setRightTab('narration')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors"
              style={{
                color: rightTab === 'narration' ? 'var(--c9-blue)' : 'var(--text-tertiary)',
                borderBottom: rightTab === 'narration' ? '2px solid var(--c9-blue)' : '2px solid transparent',
                fontFamily: 'var(--font-rajdhani)',
              }}
            >
              <Bot className="w-3.5 h-3.5" />
              Narration
            </button>
            <button
              onClick={() => setRightTab('events')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors"
              style={{
                color: rightTab === 'events' ? 'var(--c9-blue)' : 'var(--text-tertiary)',
                borderBottom: rightTab === 'events' ? '2px solid var(--c9-blue)' : '2px solid transparent',
                fontFamily: 'var(--font-rajdhani)',
              }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Events
            </button>
            <button
              onClick={() => setRightTab('chat')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors"
              style={{
                color: rightTab === 'chat' ? 'var(--c9-blue)' : 'var(--text-tertiary)',
                borderBottom: rightTab === 'chat' ? '2px solid var(--c9-blue)' : '2px solid transparent',
                fontFamily: 'var(--font-rajdhani)',
              }}
            >
              <Send className="w-3.5 h-3.5" />
              Chat
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={narrationContainerRef}>
            {rightTab === 'narration' ? (
              <>
                {moments.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => focusMoment(m, i)}
                    className="cursor-pointer p-3 transition-colors"
                    style={{
                      background: activeMomentIdx === i ? 'rgba(0,180,216,0.1)' : 'var(--bg-secondary)',
                      border: activeMomentIdx === i ? '1px solid var(--c9-blue)' : '1px solid var(--border-default)',
                      borderRadius: '2px',
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{
                      color: 'var(--c9-blue)',
                      fontFamily: 'var(--font-rajdhani)',
                      fontWeight: 600,
                    }}>
                      Moment {m.moment_index + 1}
                    </div>
                    <div className="text-xs leading-relaxed" style={{
                      color: 'var(--text-secondary)',
                    }}>
                      {m.narration}
                    </div>
                    {m.what_if_questions && m.what_if_questions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {m.what_if_questions.slice(0, 3).map((q, qi) => (
                          <button
                            key={qi}
                            onClick={(e) => { e.stopPropagation(); askWhatIf(q); }}
                            className="w-full text-left px-2 py-1.5 text-[11px] transition-all hover:brightness-125"
                            style={{
                              background: 'rgba(0,180,216,0.06)',
                              border: '1px solid rgba(0,180,216,0.15)',
                              borderRadius: '2px',
                              color: 'var(--c9-blue)',
                              fontFamily: 'var(--font-rajdhani)',
                            }}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
                {narrationLoading && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    AI analyzing phase...
                  </div>
                )}
                {!narrationLoading && moments.length === 0 && (
                  <div className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
                    No narration available for this phase.
                  </div>
                )}
              </>
            ) : rightTab === 'events' ? (
              <>
                <div className="text-xs uppercase tracking-wider mb-1" style={{
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-rajdhani)',
                }}>
                  Phase Events — {PHASE_LABELS[activePhase]}
                </div>
                <AnimatePresence>
                  {visibleEvents.map((e, i) => (
                    <motion.div
                      key={`${e.time_ms}-${e.event_type}-${i}`}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xs flex items-start gap-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span className="data-readout flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                        {(e.time_ms / 1000).toFixed(0)}s
                      </span>
                      {e.event_type === 'kill' ? (
                        <span>
                          <Skull className="w-3 h-3 inline mr-1" style={{ color: 'var(--val-red)' }} />
                          <span style={{ color: 'var(--text-primary)' }}>{String(e.details?.killer_name ?? '')}</span>
                          {' killed '}
                          <span style={{ color: 'var(--text-primary)' }}>{String(e.details?.victim_name ?? '')}</span>
                        </span>
                      ) : (
                        <span>{e.event_type}</span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {result.events.length === 0 && (
                  <div className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
                    No events in this phase.
                  </div>
                )}
              </>
            ) : rightTab === 'chat' ? (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="text-xs text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                      Ask anything about this phase...
                    </div>
                  )}
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(185,103,255,0.15)', borderRadius: '2px' }}>
                          <Bot className="w-3 h-3" style={{ color: 'var(--neon-purple, #b967ff)' }} />
                        </div>
                      )}
                      <div className="max-w-[85%]">
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {msg.toolCalls.map((tc, ti) => (
                              <span key={ti} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px]" style={{
                                background: 'rgba(185,103,255,0.1)', border: '1px solid rgba(185,103,255,0.2)',
                                borderRadius: '2px', color: 'var(--neon-purple, #b967ff)',
                              }}>
                                <Wrench className="w-2 h-2" />
                                {tc.name}
                                {tc.status === 'pending' && <Loader2 className="w-2 h-2 animate-spin" />}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-xs leading-relaxed" style={{
                          color: msg.role === 'user' ? 'var(--c9-blue)' : 'var(--text-secondary)',
                          background: msg.role === 'user' ? 'rgba(0,180,216,0.1)' : 'transparent',
                          border: msg.role === 'user' ? '1px solid rgba(0,180,216,0.2)' : 'none',
                          borderRadius: '2px',
                          padding: msg.role === 'user' ? '8px' : '0',
                        }}>
                          {msg.content}
                        </div>
                        {msg.isStreaming && !msg.content && (
                          <div className="flex gap-1 mt-1">
                            {[0, 1, 2].map((di) => (
                              <motion.div key={di} className="w-1.5 h-1.5 rounded-full"
                                style={{ background: 'var(--c9-blue)' }}
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ repeat: Infinity, duration: 1, delay: di * 0.2 }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(0,180,216,0.15)', borderRadius: '2px' }}>
                          <User className="w-3 h-3" style={{ color: 'var(--c9-blue)' }} />
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); sendChat(chatInput); }}
                  className="flex items-center gap-2 pt-3 mt-auto"
                  style={{ borderTop: '1px solid var(--border-default)' }}
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about this phase..."
                    className="flex-1 px-2 py-1.5 text-xs focus:outline-none"
                    style={{
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                      borderRadius: '2px', color: 'var(--text-primary)', fontFamily: 'var(--font-rajdhani)',
                    }}
                    disabled={isChatStreaming}
                  />
                  {isChatStreaming ? (
                    <button type="button" onClick={() => { chatAbortRef.current?.abort(); setIsChatStreaming(false); }} className="p-1.5" style={{
                      background: 'rgba(255,70,84,0.2)', border: '1px solid rgba(255,70,84,0.4)',
                      borderRadius: '2px', color: 'var(--val-red)',
                    }}>
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button type="submit" disabled={!chatInput.trim()} className="p-1.5 transition-all disabled:opacity-30" style={{
                      background: 'var(--c9-blue)', borderRadius: '2px', color: '#000',
                    }}>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                </form>
              </div>
            ) : null}
          </div>

          {/* Bottom summary + action */}
          <div className="p-4" style={{
            borderTop: '1px solid var(--border-default)',
            background: 'var(--bg-secondary)',
          }}>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Kills: </span>
                <span className="data-readout" style={{ color: 'var(--text-primary)' }}>{kills.length}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Alive: </span>
                <span className="data-readout" style={{ color: 'var(--text-primary)' }}>
                  {result.end_positions.filter((p) => p.side === round.user_side && p.is_alive).length}v{result.end_positions.filter((p) => p.side !== round.user_side && p.is_alive).length}
                </span>
              </div>
            </div>

            {hasSnapshots && (
              <div className="mb-3">
                <input
                  type="range"
                  min={0}
                  max={result.snapshots.length - 1}
                  value={snapIdx}
                  onChange={(e) => {
                    setSnapIdx(Number(e.target.value));
                    setIsPlaying(false);
                    setCameraFocus(null);
                    setActiveMomentIdx(-1);
                  }}
                  className="w-full"
                  style={{ accentColor: 'var(--c9-blue)' }}
                />
              </div>
            )}

            {result.round_ended || isLastPhase ? (
              <button
                onClick={() => setPageState('final-results')}
                className="btn-c9 w-full py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                View Final Results
              </button>
            ) : (
              <button
                onClick={planNextPhase}
                className="btn-c9 w-full py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2"
              >
                Plan {PHASE_LABELS[PHASES[phaseIdx + 1]]}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

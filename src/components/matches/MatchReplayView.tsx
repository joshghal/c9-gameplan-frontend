'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import {
  ChevronLeft, Play, Pause, Square, SkipForward, SkipBack, Film,
  Send, Loader2, MessageSquare, Bot, User, Wrench,
} from 'lucide-react';
import {
  strategyApi,
  streamNarration,
  type StrategyResult,
  type StrategySnapshot,
  type NarrationMoment,
} from '@/lib/strategy-api';
import { Markdown } from '@/components/ui/Markdown';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ─── Map data (sites) ──────────────────────────────────────────────────────
const MAP_DATA: Record<string, { sites: Record<string, { center: [number, number]; radius: number }> }> = {
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

// ─── Chat message type ──────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  toolCalls?: Array<{ name: string; status: 'pending' | 'complete' }>;
}

type RightTab = 'narration' | 'chat';

interface MatchReplayViewProps {
  roundId: string;
}

export function MatchReplayView({ roundId }: MatchReplayViewProps) {
  const router = useRouter();

  // Data
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map sizing
  const [mapSize, setMapSize] = useState(600);

  // Snapshot playback
  const [snapIdx, setSnapIdx] = useState(0);
  const [isSnapshotPlaying, setIsSnapshotPlaying] = useState(false);
  const snapshotTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Narration
  const [moments, setMoments] = useState<NarrationMoment[]>([]);
  const [narrationLoading, setNarrationLoading] = useState(false);
  const [narrationError, setNarrationError] = useState<string | null>(null);
  const [narrationReady, setNarrationReady] = useState(false);

  // Right panel tab
  const [rightTab, setRightTab] = useState<RightTab>('narration');

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const chatAbortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Load replay data ───────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);
    strategyApi.replay({ round_id: roundId }).then((data) => {
      setResult(data);
      // Hold on first frame — playback starts when narration is ready
      setSnapIdx(0);
      setIsSnapshotPlaying(false);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load replay');
    }).finally(() => setLoading(false));
  }, [roundId]);

  // ─── Map sizing ─────────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const h = window.innerHeight - 120;
      setMapSize(Math.min(800, Math.max(400, h)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ─── Snapshot playback (fixed interval per moment) ─────────────────────
  // Each snapshot = one narration moment, so use fixed 4s per tick for readability.
  useEffect(() => {
    if (!isSnapshotPlaying || !result || result.snapshots.length === 0) return;
    const INTERVAL_MS = 4000; // 4 seconds per moment — enough to read narration
    const timer = setInterval(() => {
      setSnapIdx((prev) => {
        const next = prev + 1;
        if (next >= result.snapshots.length) {
          setIsSnapshotPlaying(false);
          return prev;
        }
        return next;
      });
    }, INTERVAL_MS);
    snapshotTimerRef.current = timer;
    return () => clearInterval(timer);
  }, [isSnapshotPlaying, result]);

  // ─── 1:1 mapping: activeMomentIdx === snapIdx ─────────────────────────
  // Moments are capped to snapshot count on narration complete, so they're always equal.
  const activeMomentIdx = moments.length > 0 && snapIdx < moments.length ? snapIdx : -1;

  const prevMomentIdxRef = useRef(-1);

  // ─── Start narration when data loads ────────────────────────────────────
  useEffect(() => {
    if (!result || result.snapshots.length === 0 || moments.length > 0) return;
    startNarration();
  }, [result]);

  const startNarration = useCallback(async () => {
    if (!result) return;
    setNarrationLoading(true);
    setNarrationError(null);
    const newMoments: NarrationMoment[] = [];

    const mapName = result.reveal?.map_name || roundId.split('_')[0] || '';
    const atkTeam = result.reveal?.atk_team || result.reveal?.user_team || 'Attack';
    const defTeam = result.reveal?.def_team || result.reveal?.opponent_team || 'Defense';

    const roster: Array<{ id: string; name: string; agent: string; side: string; team: string }> = [];
    const firstSnap = result.snapshots[0];
    if (firstSnap?.players) {
      for (const p of firstSnap.players) {
        roster.push({
          id: p.player_id,
          name: p.name || p.player_id,
          agent: p.agent || '',
          side: p.side,
          team: p.team_id || p.side,
        });
      }
    }

    await streamNarration(
      result.snapshots,
      { winner: result.winner, events: result.events },
      { mapName, attackTeam: atkTeam, defenseTeam: defTeam, playerRoster: roster },
      (moment) => {
        newMoments.push(moment);
        setMoments([...newMoments]);
      },
      () => {
        setNarrationLoading(false);
        // Enforce 1:1 moment-to-snapshot mapping
        const snapCount = result.snapshots.length;
        if (newMoments.length > snapCount) {
          // Trim excess moments
          newMoments.length = snapCount;
        } else if (newMoments.length > 0 && newMoments.length < snapCount) {
          // Pad with last moment repeated (camera stays, text stays) but clear questions
          const last = newMoments[newMoments.length - 1];
          while (newMoments.length < snapCount) {
            newMoments.push({ ...last, what_if_questions: [] });
          }
        }
        setMoments([...newMoments]);
        setNarrationReady(true);
        if (newMoments.length === 0) {
          setSnapIdx(0);
          setIsSnapshotPlaying(true);
        }
      },
      (err) => {
        setNarrationError(err);
        setNarrationLoading(false);
        setSnapIdx(0);
        setIsSnapshotPlaying(true);
      },
    );
  }, [result, roundId]);

  // ─── Start playback when narration is ready ───────────────────────────
  useEffect(() => {
    if (narrationReady && moments.length > 0 && !isSnapshotPlaying) {
      setSnapIdx(0);
      setIsSnapshotPlaying(true);
    }
  }, [narrationReady, moments]);

  const playNarration = useCallback(() => {
    setIsSnapshotPlaying(true);
  }, []);

  const pauseNarration = useCallback(() => {
    setIsSnapshotPlaying(false);
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
  }, []);

  const seekToMoment = useCallback((i: number) => {
    if (!result || moments.length === 0) return;
    setSnapIdx(Math.max(0, Math.min(i, result.snapshots.length - 1)));
  }, [result, moments]);

  // ─── Chat ───────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = useCallback(async (content: string) => {
    if (!content.trim() || !result) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content };
    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', isStreaming: true };

    setChatMessages((prev) => [...prev, userMsg, assistantMsg]);
    setChatInput('');
    setIsChatStreaming(true);

    const mapName = result.reveal?.map_name || roundId.split('_')[0] || '';
    chatAbortRef.current = new AbortController();

    try {
      const resp = await fetch(`${API_BASE_URL}/coaching/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          map_context: mapName,
          team_context: 'cloud9',
          use_tools: true,
          simulation_context: {
            snapshots: result.snapshots.slice(0, 20).map((s) => ({ time_ms: s.time_ms, phase: s.phase, spike_planted: s.spike_planted })),
            final_state: { winner: result.winner },
            map_name: mapName,
            attack_team: result.reveal?.atk_team || result.reveal?.user_team || '',
            defense_team: result.reveal?.def_team || result.reveal?.opponent_team || '',
            events: result.events.slice(0, 30),
            player_roster: result.snapshots[0]?.players?.map((p) => ({
              id: p.player_id, name: p.name || p.player_id, agent: p.agent || '', side: p.side, team: p.team_id || '',
            })) || [],
            current_moment_index: snapIdx,
            current_narration: moments[snapIdx]?.narration || '',
            match_context: {
              teams: result.reveal?.atk_team && result.reveal?.def_team
                ? [result.reveal.atk_team, result.reveal.def_team]
                : [result.reveal?.user_team || '', result.reveal?.opponent_team || ''],
              tournament: result.reveal?.tournament || '',
              date: result.reveal?.match_date || '',
              round_num: result.reveal?.round_num ?? 0,
            },
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
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n\n')) {
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
      // Fallback: mark streaming done when reader finishes
      setChatMessages((prev) => prev.map((m) => m.id === assistantId && m.isStreaming ? { ...m, isStreaming: false } : m));
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setChatMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${(err as Error).message}`, isStreaming: false } : m));
      }
    } finally {
      setIsChatStreaming(false);
      chatAbortRef.current = null;
    }
  }, [result, roundId, snapIdx, moments]);

  // ─── What-If question handler ─────────────────────────────────────────
  const askWhatIf = useCallback((question: string) => {
    pauseNarration();
    setRightTab('chat');
    sendChat(question);
  }, [pauseNarration, sendChat]);

  // ─── Player name resolver ──────────────────────────────────────────────
  const playerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (result) {
      for (const snap of result.snapshots) {
        if (snap.players) {
          for (const p of snap.players) {
            if (p.name && !map[p.player_id]) map[p.player_id] = p.name;
          }
        }
      }
    }
    return map;
  }, [result]);

  const resolveNames = useCallback((text: string): string => {
    let resolved = text;
    for (const [id, name] of Object.entries(playerNameMap)) {
      resolved = resolved.replaceAll(id, name);
    }
    return resolved;
  }, [playerNameMap]);

  // ─── Current snapshot ──────────────────────────────────────────────────
  const currentSnap: StrategySnapshot | undefined = result?.snapshots[snapIdx];
  const displayPlayers = currentSnap?.players || [];
  const mapName = result?.reveal?.map_name || roundId.split('_')[0] || '';
  const mapData = MAP_DATA[mapName.toLowerCase()];

  const atkAlive = displayPlayers.filter((p) => p.side === 'attack' && p.is_alive).length;
  const defAlive = displayPlayers.filter((p) => p.side === 'defense' && p.is_alive).length;

  // ─── Loading / Error states ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center gap-3" style={{ background: 'var(--bg-abyss)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--c9-cyan)' }} />
        <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>Loading replay...</span>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-abyss)' }}>
        <div className="text-sm" style={{ color: 'var(--val-red)' }}>{error || 'No data'}</div>
        <button onClick={() => router.push('/matches')} className="text-sm" style={{ color: 'var(--c9-cyan)' }}>Back to maps</button>
      </div>
    );
  }

  // ─── Camera transform (disabled — static map view) ───────────────────

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-abyss)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-primary)' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(mapName ? `/matches?map=${mapName}` : '/matches')}
            className="flex items-center gap-1 text-sm transition-colors hover:opacity-80"
            style={{ color: 'var(--c9-cyan)', fontFamily: 'var(--font-rajdhani)' }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <div className="text-base font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
              {result.reveal?.user_team || 'Team A'}
              <span className="mx-2 text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>vs</span>
              {result.reveal?.opponent_team || 'Team B'}
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ fontFamily: 'var(--font-rajdhani)' }}>
              <span style={{ color: 'var(--c9-cyan)' }}>{mapName.toUpperCase()}</span>
              {result.reveal?.tournament && (
                <>
                  <span style={{ color: 'var(--border-default)' }}>·</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{result.reveal.tournament}</span>
                </>
              )}
              {result.reveal?.match_date && (
                <>
                  <span style={{ color: 'var(--border-default)' }}>·</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{result.reveal.match_date}</span>
                </>
              )}
              {result.reveal?.round_num != null && (
                <>
                  <span style={{ color: 'var(--border-default)' }}>·</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>Round {result.reveal.round_num}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="data-readout text-xs" style={{ color: SIDE_COLORS.attack }}>ATK {atkAlive}</span>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>vs</span>
          <span className="data-readout text-xs" style={{ color: SIDE_COLORS.defense }}>DEF {defAlive}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Map canvas */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center" style={{ background: 'var(--bg-abyss)' }}>
          <div
            className="relative"
            style={{
              width: mapSize,
              height: mapSize,
              transformOrigin: 'center center',
            }}
          >
            {/* Map image */}
            <img
              src={`/maps/${mapName.toLowerCase()}.png`}
              alt={mapName}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'brightness(0.7) contrast(1.1)' }}
            />

            {/* Site circles */}
            {mapData && Object.entries(mapData.sites).map(([name, site]) => (
              <div
                key={name}
                className="absolute flex items-center justify-center pointer-events-none"
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

            {/* FOV cones */}
            <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" viewBox={`0 0 ${mapSize} ${mapSize}`} style={{ zIndex: 5 }}>
              {displayPlayers.map((p) => {
                if (!p.is_alive || p.facing_angle == null) return null;
                const px = p.x * mapSize;
                const py = p.y * mapSize;
                const coneLength = mapSize * 0.06;
                const fovHalf = Math.PI / 4;
                const leftAngle = p.facing_angle - fovHalf;
                const rightAngle = p.facing_angle + fovHalf;
                const color = SIDE_COLORS[p.side as keyof typeof SIDE_COLORS] || '#888';
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

            {/* Player dots */}
            {displayPlayers.map((p) => {
              const color = SIDE_COLORS[p.side as keyof typeof SIDE_COLORS] || '#888';
              return (
                <motion.div
                  key={p.player_id}
                  className="absolute"
                  animate={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, opacity: p.is_alive ? 1 : 0.3 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  style={{ transform: 'translate(-50%, -50%)', zIndex: 10 }}
                >
                  <div
                    className="w-5 h-5"
                    style={{
                      backgroundColor: p.is_alive ? color : 'var(--bg-elevated)',
                      border: '2px solid rgba(255,255,255,0.5)',
                      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                      boxShadow: `0 0 6px ${color}88`,
                    }}
                  />
                  {/* Spike badge */}
                  {p.has_spike && p.is_alive && (
                    <div className="absolute -top-2 -right-2 text-[8px] font-bold leading-none" style={{ color: '#ffe600', textShadow: '0 0 4px rgba(0,0,0,0.9)' }}>⬡</div>
                  )}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap font-semibold" style={{
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-share-tech-mono)',
                    textShadow: '0 0 4px rgba(0,0,0,0.9)',
                  }}>
                    {p.name || p.player_id}
                  </div>
                </motion.div>
              );
            })}

            {/* Spike indicators */}
            {currentSnap?.spike_planted && currentSnap.spike_site && mapData?.sites[currentSnap.spike_site] && (
              <div className="absolute pointer-events-none" style={{
                left: `${mapData.sites[currentSnap.spike_site].center[0] * 100}%`,
                top: `${mapData.sites[currentSnap.spike_site].center[1] * 100}%`,
                transform: 'translate(-50%, -50%)', zIndex: 20,
              }}>
                <div className="text-lg animate-pulse" style={{ color: '#ff6b00', textShadow: '0 0 12px rgba(255,107,0,0.8)' }}>⬡</div>
                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[8px] uppercase font-bold whitespace-nowrap tracking-wider"
                  style={{ color: '#ff6b00', fontFamily: 'var(--font-rajdhani)', textShadow: '0 0 4px rgba(0,0,0,0.9)' }}>
                  Planted
                </div>
              </div>
            )}
            {currentSnap && !currentSnap.spike_planted && currentSnap.dropped_spike_x != null && currentSnap.dropped_spike_y != null && (
              <motion.div className="absolute pointer-events-none"
                animate={{ left: `${currentSnap.dropped_spike_x * 100}%`, top: `${currentSnap.dropped_spike_y * 100}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{ transform: 'translate(-50%, -50%)', zIndex: 20 }}
              >
                <div className="text-sm animate-pulse" style={{ color: '#ffe600', textShadow: '0 0 8px rgba(255,230,0,0.6)' }}>⬡</div>
                <div className="absolute top-5 left-1/2 -translate-x-1/2 text-[8px] uppercase font-bold whitespace-nowrap"
                  style={{ color: '#ffe600', fontFamily: 'var(--font-rajdhani)', textShadow: '0 0 4px rgba(0,0,0,0.9)' }}>
                  Dropped
                </div>
              </motion.div>
            )}
          </div>

          {/* Time + phase readout at bottom of map */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 pointer-events-none"
            style={{ background: 'rgba(6,8,13,0.75)', clipPath: 'var(--clip-corner-sm)' }}
          >
            <span className="data-readout text-xs" style={{ color: 'var(--c9-cyan)' }}>
              {currentSnap?.time_ms ?? 0}ms
            </span>
            <span className="text-xs uppercase" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-rajdhani)' }}>
              {currentSnap?.phase || ''}
            </span>
          </div>
        </div>

        {/* Right: Command Center panel */}
        <div className="w-[380px] flex flex-col" style={{ background: 'var(--bg-primary)', borderLeft: '1px solid var(--border-default)' }}>
          {/* Tab bar */}
          <div className="flex" style={{ borderBottom: '1px solid var(--border-default)' }}>
            {(['narration', 'chat'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-xs uppercase tracking-widest transition-all"
                style={{
                  fontFamily: 'var(--font-rajdhani)',
                  color: rightTab === tab ? 'var(--c9-cyan)' : 'var(--text-tertiary)',
                  borderBottom: rightTab === tab ? '2px solid var(--c9-cyan)' : '2px solid transparent',
                }}
              >
                {tab === 'narration' ? <Film className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                {tab === 'narration' ? 'Analysis' : 'Chat'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {rightTab === 'narration' ? (
              /* ── Narration Tab ── */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Current narration */}
                <div className="px-5 py-4 min-h-[140px] max-h-[45%] overflow-y-auto custom-scrollbar" style={{ borderBottom: '1px solid var(--border-default)' }}>
                  {activeMomentIdx >= 0 && moments[activeMomentIdx] ? (
                    <motion.div key={activeMomentIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                      <span className="data-readout text-xs" style={{ color: 'var(--c9-cyan)' }}>
                        Moment {activeMomentIdx + 1}/{moments.length} · {((currentSnap?.time_ms ?? 0) / 1000).toFixed(1)}s
                      </span>
                      <div className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                        <Markdown>{resolveNames(moments[activeMomentIdx].narration)}</Markdown>
                      </div>
                      {/* What-If questions */}
                      {moments[activeMomentIdx].what_if_questions && moments[activeMomentIdx].what_if_questions!.length > 0 && (
                        <div className="mt-4 pt-3 space-y-2" style={{ borderTop: '1px solid rgba(0,174,239,0.12)' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-3" style={{ background: 'var(--c9-cyan)' }} />
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--c9-cyan)', fontFamily: 'var(--font-rajdhani)' }}>
                              What If?
                            </div>
                          </div>
                          {moments[activeMomentIdx].what_if_questions!.slice(0, 3).map((q, qi) => (
                            <button
                              key={qi}
                              onClick={() => askWhatIf(q.replace(/\*\*/g, ''))}
                              className="w-full text-left px-3 py-2 text-xs transition-all hover:brightness-125 [&_strong]:text-white [&_strong]:font-semibold"
                              style={{
                                background: 'rgba(0,174,239,0.06)',
                                border: '1px solid rgba(0,174,239,0.15)',
                                clipPath: 'var(--clip-corner-sm)',
                                color: 'var(--c9-cyan)',
                                fontFamily: 'var(--font-rajdhani)',
                              }}
                            >
                              <Markdown>{resolveNames(q)}</Markdown>
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ) : narrationLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-4">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
                        <Film className="w-6 h-6" style={{ color: 'var(--c9-cyan)' }} />
                      </motion.div>
                      <div className="text-sm font-medium" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--c9-cyan)' }}>
                        Analyzing round...
                      </div>
                      <div className="w-full space-y-2 mt-1">
                        {[1, 0.75, 0.5].map((w, i) => (
                          <motion.div key={i} className="h-2.5 rounded-sm"
                            style={{ background: 'var(--bg-elevated)', width: `${w * 100}%` }}
                            animate={{ opacity: [0.3, 0.7, 0.3] }}
                            transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : narrationError ? (
                    <div className="text-sm" style={{ color: 'var(--val-red)' }}>{narrationError}</div>
                  ) : (
                    <div className="text-sm italic" style={{ color: 'var(--text-tertiary)' }}>Ready</div>
                  )}
                </div>

                {/* Moment dots */}
                {moments.length > 0 && (
                  <div className="flex gap-1.5 px-5 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
                    {moments.map((_, i) => (
                      <button key={i} onClick={() => seekToMoment(i)}
                        className="h-2 flex-1 transition-colors cursor-pointer hover:opacity-80"
                        style={{
                          background: i === activeMomentIdx ? 'var(--c9-cyan)' : i < activeMomentIdx ? 'rgba(0,174,239,0.4)' : 'var(--bg-elevated)',
                          clipPath: 'var(--clip-corner-sm)',
                          boxShadow: i === activeMomentIdx ? '0 0 8px rgba(0,174,239,0.4)' : 'none',
                        }}
                        title={`Moment ${i + 1}`}
                      />
                    ))}
                  </div>
                )}

                {/* Transport controls */}
                {moments.length > 0 && (
                  <div className="flex items-center justify-center gap-3 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <button onClick={() => { pauseNarration(); setSnapIdx(0); }} className="btn-tactical p-2" title="Stop"><Square className="w-4 h-4" /></button>
                    <button onClick={() => seekToMoment(Math.max(activeMomentIdx - 1, 0))} disabled={activeMomentIdx <= 0} className="btn-tactical p-2 disabled:opacity-30" title="Previous"><SkipBack className="w-4 h-4" /></button>
                    <button onClick={isSnapshotPlaying ? pauseNarration : playNarration} className="p-3" style={{ background: 'var(--c9-cyan)', clipPath: 'var(--clip-corner-sm)', color: '#000' }}>
                      {isSnapshotPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button onClick={() => seekToMoment(Math.min(activeMomentIdx + 1, moments.length - 1))} disabled={activeMomentIdx >= moments.length - 1} className="btn-tactical p-2 disabled:opacity-30" title="Next"><SkipForward className="w-4 h-4" /></button>
                  </div>
                )}

                {/* All moments list */}
                <div className="flex-1 overflow-y-auto px-5 py-3 custom-scrollbar">
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-tertiary)' }}>All Moments</div>
                  <div className="space-y-2">
                    {moments.map((m, i) => (
                      <button key={i} onClick={() => seekToMoment(i)}
                        className="w-full text-left p-3 transition-all text-xs"
                        style={{
                          background: i === activeMomentIdx ? 'rgba(0,174,239,0.12)' : 'var(--bg-elevated)',
                          border: `1px solid ${i === activeMomentIdx ? 'rgba(0,174,239,0.3)' : 'transparent'}`,
                          clipPath: 'var(--clip-corner-sm)',
                          color: i === activeMomentIdx ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        <span className="data-readout text-[10px] block mb-1" style={{ color: 'var(--c9-cyan)' }}>Moment {i + 1}</span>
                        <div className="leading-relaxed line-clamp-4 [&_p]:my-0 [&_h1]:mt-0 [&_h2]:mt-0 [&_h3]:mt-0 [&_ul]:my-0 [&_ol]:my-0">
                          <Markdown>{resolveNames(m.narration)}</Markdown>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ── Chat Tab ── */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
                  {chatMessages.length === 0 && (
                    <div className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                      Ask anything about this match...
                    </div>
                  )}
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(185,103,255,0.15)', clipPath: 'var(--clip-corner-sm)' }}>
                          <Bot className="w-3.5 h-3.5" style={{ color: 'var(--neon-purple)' }} />
                        </div>
                      )}
                      <div className="max-w-[85%]">
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {msg.toolCalls.map((tc, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px]" style={{
                                background: 'rgba(185,103,255,0.1)', border: '1px solid rgba(185,103,255,0.2)',
                                clipPath: 'var(--clip-corner-sm)', color: 'var(--neon-purple)',
                              }}>
                                <Wrench className="w-2.5 h-2.5" />
                                {tc.name}
                                {tc.status === 'pending' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                              </span>
                            ))}
                          </div>
                        )}
                        {msg.role === 'assistant' ? (
                          <Markdown>{resolveNames(msg.content)}</Markdown>
                        ) : (
                          <div className="p-3 text-sm" style={{
                            background: 'rgba(0,174,239,0.1)', border: '1px solid rgba(0,174,239,0.2)',
                            clipPath: 'var(--clip-corner-sm)', color: 'var(--text-primary)',
                          }}>
                            {msg.content}
                          </div>
                        )}
                        {msg.isStreaming && !msg.content && (
                          <div className="flex gap-1 mt-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                                style={{ background: 'var(--c9-cyan)' }}
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(0,174,239,0.15)', clipPath: 'var(--clip-corner-sm)' }}>
                          <User className="w-3.5 h-3.5" style={{ color: 'var(--c9-cyan)' }} />
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* Chat input (always visible) */}
          <div className="relative z-10" style={{ borderTop: '1px solid var(--border-default)' }}>
            <form
              onSubmit={(e) => { e.preventDefault(); sendChat(chatInput); }}
              className="flex items-center gap-2 px-4 py-3"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); } }}
                placeholder="Ask anything about this round..."
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                  clipPath: 'var(--clip-corner-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-rajdhani)',
                }}
                disabled={isChatStreaming}
              />
              {isChatStreaming ? (
                <button type="button" onClick={() => { chatAbortRef.current?.abort(); setIsChatStreaming(false); }} className="p-2" style={{
                  background: 'rgba(255,70,84,0.2)', border: '1px solid rgba(255,70,84,0.4)',
                  clipPath: 'var(--clip-corner-sm)', color: 'var(--val-red)',
                }}>
                  <Square className="w-4 h-4" />
                </button>
              ) : (
                <button type="submit" disabled={!chatInput.trim()} className="p-2 transition-all disabled:opacity-30"
                  style={{ background: 'var(--c9-cyan)', clipPath: 'var(--clip-corner-sm)', color: '#000' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

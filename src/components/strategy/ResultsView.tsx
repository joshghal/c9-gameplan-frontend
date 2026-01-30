'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, SkipForward, SkipBack, Trophy, Skull, Swords, Shield } from 'lucide-react';
import { useStrategyStore } from '@/store/strategy';
import { strategyApi } from '@/lib/strategy-api';
import type { StrategyResult, StrategySnapshot } from '@/lib/strategy-api';

const PLAYER_COLORS: Record<string, string> = {};
const SIDE_COLORS = { attack: '#ef4444', defense: '#3b82f6' };

// Map data for site rendering
const MAP_DATA: Record<string, {
  sites: Record<string, { center: [number, number]; radius: number }>;
}> = {
  ascent: { sites: { A: { center: [0.29, 0.15], radius: 0.08 }, B: { center: [0.27, 0.79], radius: 0.08 } } },
  bind: { sites: { A: { center: [0.29, 0.27], radius: 0.08 }, B: { center: [0.73, 0.33], radius: 0.08 } } },
  haven: { sites: { A: { center: [0.38, 0.14], radius: 0.07 }, B: { center: [0.40, 0.50], radius: 0.07 }, C: { center: [0.36, 0.84], radius: 0.07 } } },
  lotus: { sites: { A: { center: [0.10, 0.45], radius: 0.07 }, B: { center: [0.47, 0.42], radius: 0.07 }, C: { center: [0.87, 0.32], radius: 0.07 } } },
  split: { sites: { A: { center: [0.33, 0.09], radius: 0.08 }, B: { center: [0.32, 0.82], radius: 0.08 } } },
  icebox: { sites: { A: { center: [0.61, 0.21], radius: 0.08 }, B: { center: [0.71, 0.81], radius: 0.10 } } },
  fracture: { sites: { A: { center: [0.08, 0.45], radius: 0.08 }, B: { center: [0.92, 0.45], radius: 0.08 } } },
  pearl: { sites: { A: { center: [0.18, 0.40], radius: 0.08 }, B: { center: [0.85, 0.31], radius: 0.08 } } },
  sunset: { sites: { A: { center: [0.08, 0.40], radius: 0.08 }, B: { center: [0.82, 0.38], radius: 0.08 } } },
  abyss: { sites: { A: { center: [0.40, 0.19], radius: 0.08 }, B: { center: [0.40, 0.77], radius: 0.08 } } },
  corrode: { sites: { A: { center: [0.40, 0.19], radius: 0.08 }, B: { center: [0.40, 0.77], radius: 0.08 } } },
  breeze: { sites: { A: { center: [0.15, 0.29], radius: 0.09 }, B: { center: [0.87, 0.45], radius: 0.08 } } },
};

export function ResultsView() {
  const { result, round, reset, isReplay, setResult, setIsReplay } = useStrategyStore();
  const [currentSnapIdx, setCurrentSnapIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapSize, setMapSize] = useState(600);
  const [replayLoading, setReplayLoading] = useState(false);

  const handleWatchReplay = useCallback(async () => {
    if (!round) return;
    setReplayLoading(true);
    try {
      const replayResult = await strategyApi.replay({ round_id: round.round_id });
      setResult(replayResult);
      setIsReplay(true);
      setCurrentSnapIdx(0);
      setIsPlaying(false);
      setShowReveal(false);
    } catch {
      // silently fail
    } finally {
      setReplayLoading(false);
    }
  }, [round, setResult, setIsReplay]);

  useEffect(() => {
    const update = () => {
      const h = window.innerHeight - 160;
      setMapSize(Math.min(800, Math.max(400, h)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Auto-play
  useEffect(() => {
    if (!isPlaying || !result) return;
    timerRef.current = setInterval(() => {
      setCurrentSnapIdx((prev) => {
        if (prev >= result.snapshots.length - 1) {
          setIsPlaying(false);
          setShowReveal(true);
          return prev;
        }
        return prev + 1;
      });
    }, 400);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, result]);

  // Show reveal after playback
  useEffect(() => {
    if (!isPlaying && currentSnapIdx > 0 && result && currentSnapIdx >= result.snapshots.length - 1) {
      setShowReveal(true);
    }
  }, [isPlaying, currentSnapIdx, result]);

  if (!result || !round) return null;

  const snap = result.snapshots[currentSnapIdx];
  const mapData = MAP_DATA[round.map_name.toLowerCase()];
  const userWon = result.winner === round.user_side;
  const userAlive = snap?.players.filter((p) => p.side === round.user_side && p.is_alive).length ?? 0;
  const oppAlive = snap?.players.filter((p) => p.side !== round.user_side && p.is_alive).length ?? 0;

  // Events up to current time
  const currentTime = snap?.time_ms ?? 0;
  const visibleEvents = result.events.filter((e) => e.time_ms <= currentTime);

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/40">
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          New Plan
        </button>
        <div className="text-sm font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-2">
          Results
          {isReplay && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
              REPLAY
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500 capitalize">
          {round.map_name} ({round.user_side})
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map playback */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div
            className="relative rounded-xl overflow-hidden bg-slate-900"
            style={{ width: mapSize, height: mapSize }}
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
                className="absolute rounded-full border-2 border-yellow-500/30 flex items-center justify-center"
                style={{
                  left: `${site.center[0] * 100}%`,
                  top: `${site.center[1] * 100}%`,
                  width: `${site.radius * 2 * 100}%`,
                  height: `${site.radius * 2 * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span className="text-yellow-500/60 text-xs font-bold">{name}</span>
              </div>
            ))}

            {/* Players */}
            {snap?.players.map((p) => {
              const isUser = p.side === round.user_side;
              const color = isUser ? SIDE_COLORS.attack : SIDE_COLORS.defense;
              return (
                <div
                  key={p.player_id}
                  className="absolute transition-all duration-300"
                  style={{
                    left: `${p.x * 100}%`,
                    top: `${p.y * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    opacity: p.is_alive ? 1 : 0.3,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2"
                    style={{
                      backgroundColor: p.is_alive ? color : '#374151',
                      borderColor: isUser ? '#ffffff' : '#94a3b8',
                    }}
                  />
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 text-[9px] text-white whitespace-nowrap">
                    {p.name}
                  </div>
                </div>
              );
            })}

            {/* Alive counts */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-4 text-sm pointer-events-none">
              <div className="flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-red-400" />
                <span className={round.user_side === 'attack' ? 'text-white font-bold' : 'text-gray-400'}>
                  {round.user_side === 'attack' ? userAlive : oppAlive}
                </span>
              </div>
              <span className="text-gray-600">vs</span>
              <div className="flex items-center gap-1.5">
                <span className={round.user_side === 'defense' ? 'text-white font-bold' : 'text-gray-400'}>
                  {round.user_side === 'defense' ? userAlive : oppAlive}
                </span>
                <Shield className="w-3.5 h-3.5 text-blue-400" />
              </div>
            </div>

            {/* Time */}
            <div className="absolute bottom-3 left-3 text-xs text-white/50 font-mono">
              {((currentTime) / 1000).toFixed(0)}s
            </div>
          </div>
        </div>

        {/* Right panel: Events + Reveal */}
        <div className="w-[300px] flex-shrink-0 border-l border-white/10 flex flex-col overflow-hidden">
          {/* Event log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Event Log</div>
            {visibleEvents.map((e, i) => (
              <div key={i} className="text-xs text-gray-400 flex items-start gap-2">
                <span className="text-gray-600 font-mono flex-shrink-0">{(e.time_ms / 1000).toFixed(0)}s</span>
                {e.event_type === 'kill' ? (
                  <span>
                    <Skull className="w-3 h-3 text-red-400 inline mr-1" />
                    <span className="text-white">{String(e.details?.killer_name ?? '')}</span>
                    {' killed '}
                    <span className="text-white">{String(e.details?.victim_name ?? '')}</span>
                    {e.details?.weapon != null && e.details.weapon !== 'unknown' ? (
                      <span className="text-gray-500 ml-1">({String(e.details.weapon)}{e.details?.headshot ? ' HS' : ''})</span>
                    ) : null}
                  </span>
                ) : (
                  <span>{e.event_type}: {JSON.stringify(e.details)}</span>
                )}
              </div>
            ))}
            {visibleEvents.length === 0 && (
              <div className="text-gray-600 text-xs italic">No events yet...</div>
            )}
          </div>

          {/* Reveal card */}
          <AnimatePresence>
            {showReveal && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 border-t ${userWon ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className={`w-5 h-5 ${userWon ? 'text-green-400' : 'text-red-400'}`} />
                  <span className={`font-bold text-lg ${userWon ? 'text-green-400' : 'text-red-400'}`}>
                    {userWon ? 'Victory!' : 'Defeat'}
                  </span>
                  {result.reveal.score_line && (
                    <span className="text-sm text-gray-400 ml-auto">
                      Kills {result.reveal.score_line}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-300 mt-2">
                  {(() => {
                    const myTeam = isReplay
                      ? (round.user_side === 'attack' ? result.reveal.atk_team : result.reveal.def_team) ?? result.reveal.user_team
                      : result.reveal.user_team;
                    const oppTeam = isReplay
                      ? (round.user_side === 'attack' ? result.reveal.def_team : result.reveal.atk_team) ?? result.reveal.opponent_team
                      : result.reveal.opponent_team;
                    return (
                      <>
                        <span className="text-white font-semibold">{myTeam}</span>
                        <span className="text-gray-500 mx-1.5">vs</span>
                        <span className="text-white font-semibold">{oppTeam}</span>
                      </>
                    );
                  })()}
                </div>
                <div className="text-xs text-gray-500 mt-1.5 flex items-center gap-2 flex-wrap">
                  <span>{result.reveal.round_desc}</span>
                  <span className="text-gray-600">·</span>
                  <span className="capitalize">{isReplay ? `${round.user_side} side` : `${result.reveal.user_side} side`}</span>
                  {result.reveal.sim_duration_s != null && (
                    <>
                      <span className="text-gray-600">·</span>
                      <span>{result.reveal.sim_duration_s}s</span>
                    </>
                  )}
                </div>
                {(result.reveal.tournament || result.reveal.match_date) && (
                  <div className="text-xs text-gray-500 mt-1">
                    {result.reveal.tournament && <span>{result.reveal.tournament}</span>}
                    {result.reveal.tournament && result.reveal.match_date && <span className="text-gray-600"> · </span>}
                    {result.reveal.match_date && <span>{result.reveal.match_date}</span>}
                  </div>
                )}
                {result.reveal.opponent_players && result.reveal.opponent_players.length > 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    vs {result.reveal.opponent_players.join(', ')}
                  </div>
                )}
                {!isReplay && (
                  <button
                    onClick={handleWatchReplay}
                    disabled={replayLoading}
                    className="mt-3 w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {replayLoading ? 'Loading...' : 'Watch Real Match'}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-4 px-5 py-3 border-t border-white/10 bg-black/40">
        <button
          onClick={() => setCurrentSnapIdx(Math.max(0, currentSnapIdx - 1))}
          disabled={currentSnapIdx <= 0}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 disabled:opacity-30"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-3 rounded-full bg-purple-500 hover:bg-purple-600 text-white"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        <button
          onClick={() => setCurrentSnapIdx(Math.min(result.snapshots.length - 1, currentSnapIdx + 1))}
          disabled={currentSnapIdx >= result.snapshots.length - 1}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 disabled:opacity-30"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Progress bar */}
        <div className="flex-1 max-w-md">
          <input
            type="range"
            min={0}
            max={result.snapshots.length - 1}
            value={currentSnapIdx}
            onChange={(e) => setCurrentSnapIdx(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
        </div>

        <span className="text-xs text-gray-500 font-mono">
          {currentSnapIdx + 1}/{result.snapshots.length}
        </span>
      </div>
    </div>
  );
}

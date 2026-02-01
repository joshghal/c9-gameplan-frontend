'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, SkipForward, SkipBack, Trophy, Skull, Swords, Shield } from 'lucide-react';
import { useStrategyStore } from '@/store/strategy';
import { strategyApi } from '@/lib/strategy-api';
import type { StrategyResult, StrategySnapshot } from '@/lib/strategy-api';

const PLAYER_COLORS: Record<string, string> = {};
const SIDE_COLORS = { attack: '#ff4654', defense: '#12d4b4' };

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
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-abyss)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3" style={{
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-default)',
      }}>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          New Plan
        </button>
        <div className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-rajdhani)',
        }}>
          Results
          {isReplay && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold" style={{
              background: 'rgba(185,103,255,0.15)',
              color: 'var(--neon-purple)',
              border: '1px solid rgba(185,103,255,0.3)',
              clipPath: 'var(--clip-corner-sm)',
            }}>
              REPLAY
            </span>
          )}
        </div>
        <div className="text-sm capitalize" style={{
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-rajdhani)',
        }}>
          {round.map_name} ({round.user_side})
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map playback */}
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
                    className="w-4 h-4"
                    style={{
                      backgroundColor: p.is_alive ? color : 'var(--bg-elevated)',
                      borderColor: isUser ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      border: '2px solid',
                      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                    }}
                  />
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap" style={{
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-share-tech-mono)',
                  }}>
                    {p.name}
                  </div>
                </div>
              );
            })}

            {/* Alive counts */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-4 text-sm pointer-events-none">
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

            {/* Time */}
            <div className="absolute bottom-3 left-3 text-xs data-readout" style={{ color: 'var(--text-tertiary)' }}>
              {((currentTime) / 1000).toFixed(0)}s
            </div>
          </div>
        </div>

        {/* Right panel: Events + Reveal */}
        <div className="w-[300px] flex-shrink-0 flex flex-col overflow-hidden" style={{ borderLeft: '1px solid var(--border-default)' }}>
          {/* Event log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-xs uppercase tracking-wider mb-2" style={{
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-rajdhani)',
            }}>Event Log</div>
            {visibleEvents.map((e, i) => (
              <div key={i} className="text-xs flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                <span className="data-readout flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{(e.time_ms / 1000).toFixed(0)}s</span>
                {e.event_type === 'kill' ? (
                  <span>
                    <Skull className="w-3 h-3 inline mr-1" style={{ color: 'var(--val-red)' }} />
                    <span style={{ color: 'var(--text-primary)' }}>{String(e.details?.killer_name ?? '')}</span>
                    {' killed '}
                    <span style={{ color: 'var(--text-primary)' }}>{String(e.details?.victim_name ?? '')}</span>
                    {e.details?.weapon != null && e.details.weapon !== 'unknown' ? (
                      <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>({String(e.details.weapon)}{e.details?.headshot ? ' HS' : ''})</span>
                    ) : null}
                  </span>
                ) : (
                  <span>{e.event_type}: {JSON.stringify(e.details)}</span>
                )}
              </div>
            ))}
            {visibleEvents.length === 0 && (
              <div className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>No events yet...</div>
            )}
          </div>

          {/* Reveal card */}
          <AnimatePresence>
            {showReveal && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5"
                style={{
                  borderTop: `1px solid ${userWon ? 'rgba(18,212,180,0.3)' : 'rgba(255,70,84,0.3)'}`,
                  background: userWon ? 'rgba(18,212,180,0.08)' : 'rgba(255,70,84,0.08)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5" style={{ color: userWon ? 'var(--val-teal)' : 'var(--val-red)' }} />
                  <span className="font-bold text-lg uppercase tracking-wider" style={{
                    fontFamily: 'var(--font-rajdhani)',
                    color: userWon ? 'var(--val-teal)' : 'var(--val-red)',
                  }}>
                    {userWon ? 'Victory!' : 'Defeat'}
                  </span>
                  {result.reveal.score_line && (
                    <span className="text-sm ml-auto" style={{ color: 'var(--text-secondary)' }}>
                      Kills {result.reveal.score_line}
                    </span>
                  )}
                </div>
                <div className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                  {(() => {
                    const myTeam = isReplay
                      ? (round.user_side === 'attack' ? result.reveal.atk_team : result.reveal.def_team) ?? result.reveal.user_team
                      : result.reveal.user_team;
                    const oppTeam = isReplay
                      ? (round.user_side === 'attack' ? result.reveal.def_team : result.reveal.atk_team) ?? result.reveal.opponent_team
                      : result.reveal.opponent_team;
                    return (
                      <>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{myTeam}</span>
                        <span className="mx-1.5" style={{ color: 'var(--text-tertiary)' }}>vs</span>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{oppTeam}</span>
                      </>
                    );
                  })()}
                </div>
                <div className="text-xs mt-1.5 flex items-center gap-2 flex-wrap" style={{
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-rajdhani)',
                }}>
                  <span>{result.reveal.round_desc}</span>
                  <span style={{ color: 'var(--border-default)' }}>·</span>
                  <span className="capitalize">{isReplay ? `${round.user_side} side` : `${result.reveal.user_side} side`}</span>
                  {result.reveal.sim_duration_s != null && (
                    <>
                      <span style={{ color: 'var(--border-default)' }}>·</span>
                      <span className="data-readout">{result.reveal.sim_duration_s}s</span>
                    </>
                  )}
                </div>
                {(result.reveal.tournament || result.reveal.match_date) && (
                  <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    {result.reveal.tournament && <span>{result.reveal.tournament}</span>}
                    {result.reveal.tournament && result.reveal.match_date && <span style={{ color: 'var(--border-default)' }}> · </span>}
                    {result.reveal.match_date && <span>{result.reveal.match_date}</span>}
                  </div>
                )}
                {result.reveal.opponent_players && result.reveal.opponent_players.length > 0 && (
                  <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    vs {result.reveal.opponent_players.join(', ')}
                  </div>
                )}
                {!isReplay && (
                  <button
                    onClick={handleWatchReplay}
                    disabled={replayLoading}
                    className="btn-c9 mt-3 w-full py-2 px-3 text-sm font-medium disabled:opacity-50"
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
      <div className="flex items-center justify-center gap-4 px-5 py-3" style={{
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-default)',
      }}>
        <button
          onClick={() => setCurrentSnapIdx(Math.max(0, currentSnapIdx - 1))}
          disabled={currentSnapIdx <= 0}
          className="btn-tactical p-2 disabled:opacity-30"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-3"
          style={{
            background: 'var(--neon-purple)',
            color: 'white',
            clipPath: 'var(--clip-corner-sm)',
          }}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        <button
          onClick={() => setCurrentSnapIdx(Math.min(result.snapshots.length - 1, currentSnapIdx + 1))}
          disabled={currentSnapIdx >= result.snapshots.length - 1}
          className="btn-tactical p-2 disabled:opacity-30"
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
            className="w-full"
            style={{ accentColor: 'var(--neon-purple)' }}
          />
        </div>

        <span className="text-xs data-readout" style={{ color: 'var(--text-tertiary)' }}>
          {currentSnapIdx + 1}/{result.snapshots.length}
        </span>
      </div>
    </div>
  );
}

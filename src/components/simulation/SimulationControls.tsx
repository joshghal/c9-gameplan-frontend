'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  SkipForward,
  Zap,
  Brain,
  Loader2,
} from 'lucide-react';
import { useSimulationStore } from '@/store/simulation';
import { useCameraStore } from '@/store/camera';
import { coachingApi } from '@/lib/api';
import { formatTime, TEAM_COLORS, PHASE_NAMES } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface SimulationControlsProps {
  variant?: 'default' | 'overlay';
}

export function SimulationControls({ variant = 'default' }: SimulationControlsProps) {
  const {
    status,
    currentTime,
    phase,
    isPlaying,
    playbackSpeed,
    positions,
    spikePlanted,
    isLoading,
    snapshots,
    aiCommentaryEnabled,
    liveNarrationText,
    liveNarrationPaused,
    previousNarrations,
    mapName,
    attackTeamId,
    defenseTeamId,
    sessionId,
    createSimulation,
    startSimulation,
    tickSimulation,
    pauseSimulation,
    runToCompletion,
    togglePlayback,
    setPlaybackSpeed,
    reset,
    setAiCommentaryEnabled,
    setLiveNarration,
    setLiveNarrationPaused,
    continueLiveNarration,
  } = useSimulationStore();
  const { panTo, setHighlightedPlayers, setFocusLabel } = useCameraStore();

  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-tick when playing
  useEffect(() => {
    if (isPlaying && status === 'running') {
      const interval = 128 / playbackSpeed; // Base tick rate adjusted by speed
      tickIntervalRef.current = setInterval(() => {
        tickSimulation(1);
      }, interval);
    }

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
  }, [isPlaying, status, playbackSpeed, tickSimulation]);

  // Live narration Mode A: when new snapshot appears during running sim, pause and narrate
  const lastSnapshotCountRef = useRef(0);
  useEffect(() => {
    if (!aiCommentaryEnabled || status !== 'running' || liveNarrationPaused) return;
    if (snapshots.length > lastSnapshotCountRef.current && lastSnapshotCountRef.current > 0) {
      // New snapshot captured — pause and request narration
      const latestSnap = snapshots[snapshots.length - 1];
      const isKeyMoment = latestSnap.label?.startsWith('kill') || latestSnap.label?.startsWith('spike_plant');
      if (isKeyMoment) {
        setLiveNarrationPaused(true);
        // Call narrate-snapshot API
        coachingApi.narrateSnapshot({
          session_id: sessionId || 'live',
          snapshot: latestSnap as unknown as Record<string, unknown>,
          previous_narrations: previousNarrations,
          narration_type: 'key_moment',
          map_name: mapName,
          attack_team: attackTeamId,
          defense_team: defenseTeamId,
        }).then((resp) => {
          const data = resp.data;
          setLiveNarration(data.narration || 'Key moment detected.');
          if (data.camera_target) {
            panTo(data.camera_target.x, data.camera_target.y, data.camera_target.zoom);
          }
          if (data.highlight_players) {
            setHighlightedPlayers(data.highlight_players);
          }
          if (data.narration) {
            setFocusLabel(data.narration.slice(0, 60));
          }
        }).catch(() => {
          setLiveNarration('Key moment — AI analysis unavailable.');
        });
      }
    }
    lastSnapshotCountRef.current = snapshots.length;
  }, [snapshots.length, aiCommentaryEnabled, status, liveNarrationPaused, sessionId, mapName, attackTeamId, defenseTeamId, previousNarrations, setLiveNarrationPaused, setLiveNarration, panTo, setHighlightedPlayers, setFocusLabel]);

  const attackAlive = positions.filter((p) => p.side === 'attack' && p.is_alive).length;
  const defenseAlive = positions.filter((p) => p.side === 'defense' && p.is_alive).length;

  // Replace player IDs (e.g. "g2_5", "c9_2") with actual names in narration text
  const resolveNames = useCallback((text: string): string => {
    let resolved = text;
    for (const p of positions) {
      if (p.name && p.player_id) {
        resolved = resolved.replaceAll(p.player_id, p.name);
      }
    }
    return resolved;
  }, [positions]);

  const handleStart = async () => {
    if (status === 'idle') {
      await createSimulation();
    }
    if (status === 'created' || status === 'idle') {
      await startSimulation();
    }
  };

  // ─── OVERLAY VARIANT (running stage bottom bar) ───
  if (variant === 'overlay') {
    return (
      <div className="relative frosted-glass px-6 py-3" style={{ clipPath: 'none' }}>
        <div className="flex items-center justify-between gap-6 max-w-[1200px] mx-auto">
          {/* Timer */}
          <div className="flex items-center gap-3">
            <span className="data-readout text-lg text-glow-cyan">{formatTime(currentTime)}</span>
            <span className="text-xs uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-tertiary)' }}>
              {PHASE_NAMES[phase] ?? phase.replaceAll('_', ' ')}
            </span>
          </div>

          {/* Team pips */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--val-red)' }}>ATK</span>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-5 h-1" style={{
                  background: i < attackAlive ? 'var(--val-red)' : 'var(--bg-elevated)',
                  clipPath: 'var(--clip-corner-sm)',
                  boxShadow: i < attackAlive ? '0 0 6px rgba(255,70,84,0.4)' : 'none',
                }} />
              ))}
              <span className="data-readout text-sm ml-1" style={{ color: 'var(--val-red)' }}>{attackAlive}</span>
            </div>
            <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-rajdhani)' }}>VS</span>
            <div className="flex items-center gap-1.5">
              <span className="data-readout text-sm mr-1" style={{ color: 'var(--val-teal)' }}>{defenseAlive}</span>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-5 h-1" style={{
                  background: i < defenseAlive ? 'var(--val-teal)' : 'var(--bg-elevated)',
                  clipPath: 'var(--clip-corner-sm)',
                  boxShadow: i < defenseAlive ? '0 0 6px rgba(18,212,180,0.4)' : 'none',
                }} />
              ))}
              <span className="text-xs uppercase" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--val-teal)' }}>DEF</span>
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <button onClick={reset} className="btn-tactical p-2" title="Reset">
              <RotateCcw className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
            <button
              onClick={togglePlayback}
              disabled={status === 'completed'}
              className={cn('p-2.5 transition-all', isPlaying ? 'btn-tactical' : 'btn-c9', status === 'completed' && 'opacity-50')}
            >
              {isPlaying ? <Pause className="w-5 h-5" style={{ color: 'var(--c9-cyan)' }} /> : <Play className="w-5 h-5 text-black" />}
            </button>
            <button onClick={() => tickSimulation(10)} disabled={status !== 'running'} className="btn-tactical p-2 disabled:opacity-50" title="Skip">
              <SkipForward className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
            <button onClick={runToCompletion} disabled={status !== 'running' || isLoading} className="btn-tactical p-2 disabled:opacity-50" title="Fast Forward">
              <FastForward className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-1">
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={cn('px-2 py-0.5 text-xs transition-all', playbackSpeed === speed ? 'text-black' : 'btn-tactical')}
                style={playbackSpeed === speed ? {
                  background: 'var(--c9-cyan)',
                  clipPath: 'var(--clip-corner-sm)',
                  fontFamily: 'var(--font-jetbrains-mono)',
                } : { fontFamily: 'var(--font-jetbrains-mono)' }}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* AI Commentary toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-tertiary)' }}>AI Commentary</span>
            <button
              onClick={() => setAiCommentaryEnabled(!aiCommentaryEnabled)}
              title="Pause at kills for AI tactical breakdown"
              className="relative w-9 h-[18px] transition-colors"
              style={{
                background: aiCommentaryEnabled ? 'var(--c9-cyan)' : 'var(--bg-elevated)',
                clipPath: 'var(--clip-corner-sm)',
                border: `1px solid ${aiCommentaryEnabled ? 'var(--c9-cyan)' : 'var(--border-default)'}`,
              }}
            >
              <div
                className={cn(
                  'absolute top-0.5 w-3.5 h-3 bg-white transition-transform',
                  aiCommentaryEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                )}
                style={{ clipPath: 'var(--clip-corner-sm)' }}
              />
            </button>
          </div>

          {/* Spike alert (inline) */}
          {spikePlanted && (
            <div className="flex items-center gap-2 px-3 py-1" style={{
              background: 'rgba(255,70,84,0.15)',
              border: '1px solid rgba(255,70,84,0.4)',
              clipPath: 'var(--clip-corner-sm)',
            }}>
              <Zap className="w-4 h-4" style={{ color: 'var(--val-red)' }} />
              <span className="text-xs font-bold uppercase" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--val-red)' }}>SPIKE</span>
            </div>
          )}
        </div>

        {/* Live narration overlay — loading or ready */}
        <AnimatePresence>
          {liveNarrationPaused && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[480px] p-4"
              style={{
                clipPath: 'var(--clip-corner-sm)',
                background: 'rgba(6,8,13,0.45)',
                backdropFilter: 'blur(40px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(40px) saturate(1.4)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4" style={{ color: 'var(--c9-cyan)' }} />
                <span className="text-xs uppercase tracking-widest font-semibold" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--c9-cyan)' }}>AI Commentary</span>
              </div>
              {liveNarrationText ? (
                <>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }}>{resolveNames(liveNarrationText)}</p>
                  <button
                    onClick={continueLiveNarration}
                    className="w-full py-2 text-sm font-medium flex items-center justify-center gap-2"
                    style={{
                      background: 'var(--c9-cyan)', color: '#000',
                      clipPath: 'var(--clip-corner-sm)', fontFamily: 'var(--font-rajdhani)',
                      fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
                    }}
                  >
                    <Play className="w-4 h-4" /> Continue
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--c9-cyan)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-share-tech-mono)' }}>Analyzing key moment...</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── DEFAULT VARIANT ───
  return (
    <div className="hud-panel hud-panel-cyan p-5">
      {/* Timer and Phase */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>Round Time</div>
          <div className="data-readout-lg text-glow-cyan">
            {formatTime(currentTime)}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs uppercase tracking-widest mb-1" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>Phase</div>
          <div className="text-lg font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
            {PHASE_NAMES[phase] ?? phase.replaceAll('_', ' ')}
          </div>
        </div>
      </div>

      {/* Team Stats — compact */}
      <div className="flex items-center gap-3 mb-5">
        {/* Attack */}
        <div className="flex-1 p-2.5" style={{ backgroundColor: TEAM_COLORS.attack.bg, clipPath: 'var(--clip-corner-sm)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--val-red)' }}>ATK</span>
            <span className="data-readout text-sm font-bold" style={{ color: 'var(--val-red)' }}>{attackAlive}</span>
          </div>
          <div className="flex gap-1 mt-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-1 h-1" style={{
                background: i < attackAlive ? 'var(--val-red)' : 'var(--bg-elevated)',
                clipPath: 'var(--clip-corner-sm)',
                boxShadow: i < attackAlive ? '0 0 6px rgba(255,70,84,0.4)' : 'none',
              }} />
            ))}
          </div>
        </div>

        <span className="text-xs font-bold" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-tertiary)' }}>VS</span>

        {/* Defense */}
        <div className="flex-1 p-2.5" style={{ backgroundColor: TEAM_COLORS.defense.bg, clipPath: 'var(--clip-corner-sm)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--val-teal)' }}>DEF</span>
            <span className="data-readout text-sm font-bold" style={{ color: 'var(--val-teal)' }}>{defenseAlive}</span>
          </div>
          <div className="flex gap-1 mt-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-1 h-1" style={{
                background: i < defenseAlive ? 'var(--val-teal)' : 'var(--bg-elevated)',
                clipPath: 'var(--clip-corner-sm)',
                boxShadow: i < defenseAlive ? '0 0 6px rgba(18,212,180,0.4)' : 'none',
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Spike Status */}
      {spikePlanted && (
        <div className="mb-4 p-2.5 flex items-center gap-2" style={{
          background: 'rgba(255,70,84,0.12)',
          border: '1px solid rgba(255,70,84,0.4)',
          clipPath: 'var(--clip-corner-sm)',
        }}>
          <Zap className="w-4 h-4" style={{ color: 'var(--val-red)' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--val-red)' }}>SPIKE PLANTED</span>
        </div>
      )}

      {/* Playback Controls — or New Simulation button when completed */}
      {status === 'completed' ? (
        <button
          onClick={reset}
          className="btn-c9 w-full flex items-center justify-center gap-2 py-3 text-sm font-medium mb-4"
        >
          <RotateCcw className="w-4 h-4" />
          New Simulation
        </button>
      ) : (
        <>
          <div className="flex items-center justify-center gap-3 mb-4">
            <button onClick={reset} className="btn-tactical p-3" title="Reset">
              <RotateCcw className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            </button>

            {status === 'idle' || status === 'created' ? (
              <button onClick={handleStart} disabled={isLoading} className="btn-c9 p-4 disabled:opacity-50">
                <Play className="w-8 h-8 text-black" />
              </button>
            ) : (
              <button
                onClick={togglePlayback}
                className={cn('p-4 transition-all', isPlaying ? 'btn-tactical' : 'btn-c9')}
              >
                {isPlaying ? <Pause className="w-8 h-8" style={{ color: 'var(--c9-cyan-light)' }} /> : <Play className="w-8 h-8 text-black" />}
              </button>
            )}

            <button onClick={() => tickSimulation(10)} disabled={status !== 'running'} className="btn-tactical p-3 disabled:opacity-50" title="Skip 10 ticks">
              <SkipForward className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            </button>
            <button onClick={runToCompletion} disabled={status !== 'running' || isLoading} className="btn-tactical p-3 disabled:opacity-50" title="Run to completion">
              <FastForward className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>

          {/* Speed Controls */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xs uppercase tracking-widest mr-2" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>Speed:</span>
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={cn('px-3 py-1 text-sm font-medium transition-all', playbackSpeed === speed ? 'text-black' : 'btn-tactical')}
                style={playbackSpeed === speed ? { background: 'var(--c9-cyan)', clipPath: 'var(--clip-corner-sm)', fontFamily: 'var(--font-jetbrains-mono)' } : { fontFamily: 'var(--font-jetbrains-mono)' }}
              >
                {speed}x
              </button>
            ))}
          </div>
        </>
      )}

      {/* AI Commentary Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4" style={{ color: 'var(--c9-cyan)' }} />
          <span className="text-xs uppercase tracking-widest" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>Live AI Commentary</span>
        </div>
        <button
          onClick={() => setAiCommentaryEnabled(!aiCommentaryEnabled)}
          title="Pause at kills for AI analysis"
          className="relative w-10 h-5 transition-colors"
          style={{
            background: aiCommentaryEnabled ? 'var(--c9-cyan)' : 'var(--bg-elevated)',
            clipPath: 'var(--clip-corner-sm)',
            border: `1px solid ${aiCommentaryEnabled ? 'var(--c9-cyan)' : 'var(--border-default)'}`,
          }}
        >
          <div
            className={cn('absolute top-0.5 w-4 h-4 bg-white transition-transform', aiCommentaryEnabled ? 'translate-x-5' : 'translate-x-0.5')}
            style={{ clipPath: 'var(--clip-corner-sm)' }}
          />
        </button>
      </div>
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Pauses at kills for AI tactical breakdown</span>

      {/* Live Narration Card */}
      <AnimatePresence>
        {liveNarrationPaused && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4"
            style={{
              background: 'rgba(0,174,239,0.08)',
              border: '1px solid rgba(0,174,239,0.25)',
              clipPath: 'var(--clip-corner-sm)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4" style={{ color: 'var(--c9-cyan)' }} />
              <span className="text-xs uppercase tracking-widest font-semibold" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--c9-cyan)' }}>AI Commentary</span>
            </div>
            {liveNarrationText ? (
              <>
                <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }}>{resolveNames(liveNarrationText)}</p>
                <button
                  onClick={continueLiveNarration}
                  className="w-full py-2 text-sm font-medium transition-all flex items-center justify-center gap-2"
                  style={{
                    background: 'var(--c9-cyan)', color: '#000',
                    clipPath: 'var(--clip-corner-sm)', fontFamily: 'var(--font-rajdhani)',
                    fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}
                >
                  <Play className="w-4 h-4" />
                  Continue
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--c9-cyan)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-share-tech-mono)' }}>Analyzing key moment...</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snapshot Timeline */}
      {snapshots.length > 0 && (
        <div className="mt-5">
          <div className="text-xs uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>Key Moments</div>
          <div className="relative h-1.5" style={{ background: 'var(--bg-elevated)', clipPath: 'var(--clip-corner-sm)' }}>
            {snapshots.map((snap: { id: string; time_ms: number; label?: string }, i: number) => {
              const pct = Math.min((snap.time_ms / 100000) * 100, 100);
              const isKill = snap.label?.startsWith('kill');
              const isPlant = snap.label?.startsWith('spike_plant');
              return (
                <div
                  key={snap.id}
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5"
                  style={{
                    left: `${pct}%`,
                    background: isKill ? 'var(--val-red)' : isPlant ? 'var(--val-red)' : 'var(--text-tertiary)',
                    clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                    boxShadow: isKill ? '0 0 6px rgba(255,70,84,0.5)' : isPlant ? '0 0 6px rgba(255,70,84,0.5)' : 'none',
                  }}
                  title={snap.label || `${snap.time_ms}ms`}
                />
              );
            })}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4"
              style={{
                left: `${Math.min((currentTime / 100000) * 100, 100)}%`,
                background: 'var(--c9-cyan)',
                boxShadow: '0 0 6px var(--c9-cyan)',
              }}
            />
          </div>
        </div>
      )}

      {/* Result status */}
      {status === 'completed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-5 p-3 text-center"
          style={{
            background: 'rgba(0,174,239,0.06)',
            border: '1px solid rgba(0,174,239,0.2)',
            clipPath: 'var(--clip-corner-sm)',
          }}
        >
          <div className="text-lg font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
            {defenseAlive === 0
              ? 'Attack Wins'
              : attackAlive === 0
              ? 'Defense Wins'
              : spikePlanted
              ? 'Attack Wins — Spike Detonated'
              : 'Time Expired — Defense Wins'}
          </div>
          <div className="text-xs mt-1 data-readout" style={{ color: 'var(--text-secondary)' }}>
            Completed in {formatTime(currentTime)}
          </div>
        </motion.div>
      )}

    </div>
  );
}

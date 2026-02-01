'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Film, SkipForward, SkipBack, X } from 'lucide-react';
import { useCameraStore } from '@/store/camera';
import { useSimulationStore } from '@/store/simulation';
import { useNarrationTimeline, type NarrationMoment } from '@/hooks/useNarrationTimeline';
import { MapCanvas } from './MapCanvas';
import { Markdown } from '@/components/ui/Markdown';

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

interface NarrationWalkthroughProps {
  snapshots: Snapshot[];
  finalState: Record<string, unknown>;
}

export function NarrationWalkthrough({ snapshots, finalState }: NarrationWalkthroughProps) {
  const [moments, setMoments] = useState<NarrationMoment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setTheaterMode } = useCameraStore();
  const { mapName, attackTeamId, defenseTeamId } = useSimulationStore();
  const { buildTimeline, play, pause, stop, seekToMoment, currentMoment, isPlaying } = useNarrationTimeline(snapshots);
  const { positions, setPositions } = useSimulationStore();
  const savedPositionsRef = useRef(positions);

  // Build player_id → name map from positions + snapshots for narration text replacement
  const playerNameMap = useRef<Record<string, string>>({});
  useEffect(() => {
    const map: Record<string, string> = {};
    // From store positions (has name field from backend)
    for (const p of positions) {
      if (p.name) map[p.player_id] = p.name;
    }
    // Also from snapshot player data as fallback
    for (const snap of snapshots) {
      if (snap.players) {
        for (const p of snap.players) {
          if ((p as Record<string, unknown>).name && !map[p.player_id]) {
            map[p.player_id] = String((p as Record<string, unknown>).name);
          }
        }
      }
    }
    if (Object.keys(map).length > 0) playerNameMap.current = map;
  }, [positions, snapshots]);

  // Replace player IDs like "c9_3" with actual names like "leaf" in narration text
  const resolveNarrationNames = useCallback((text: string): string => {
    let resolved = text;
    for (const [id, name] of Object.entries(playerNameMap.current)) {
      resolved = resolved.replaceAll(id, name);
    }
    return resolved;
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleStop();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isModalOpen]);

  const startNarration = useCallback(async () => {
    if (snapshots.length === 0) {
      setError('No key moments captured. Run a simulation first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsModalOpen(true);
    setTheaterMode(true);
    savedPositionsRef.current = useSimulationStore.getState().positions;
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
      setError(err instanceof Error ? err.message : 'Failed to start narration');
    } finally {
      setIsLoading(false);
    }
  }, [snapshots, finalState, mapName, attackTeamId, defenseTeamId, setTheaterMode, buildTimeline, play]);

  const handleStop = useCallback(() => {
    stop();
    setTheaterMode(false);
    setIsModalOpen(false);
    setMoments([]);
    if (savedPositionsRef.current.length > 0) {
      setPositions(savedPositionsRef.current);
    }
  }, [stop, setTheaterMode, setPositions]);

  // Launch button (shown when modal is closed)
  if (!isModalOpen && moments.length === 0) {
    return (
      <button
        onClick={startNarration}
        disabled={isLoading || snapshots.length === 0}
        className="btn-c9 w-full flex items-center justify-center gap-2 py-3 px-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
              <Film className="w-5 h-5" />
            </motion.div>
            Generating Analysis...
          </>
        ) : (
          <>
            <Film className="w-5 h-5" />
            Watch AI Analysis
          </>
        )}
      </button>
    );
  }

  // Fullscreen modal via portal
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
          {/* Left: Map Canvas — fills available height */}
          <div className="flex-1 flex items-center justify-center p-4 min-w-0 overflow-hidden">
            <MapCanvas width={Math.min(900, typeof window !== 'undefined' ? window.innerHeight - 40 : 700)} height={Math.min(900, typeof window !== 'undefined' ? window.innerHeight - 40 : 700)} />
          </div>

          {/* Right: Narration Panel */}
          <div className="w-[360px] flex-shrink-0 flex flex-col overflow-hidden relative" style={{
            borderLeft: '1px solid var(--border-default)',
            background: 'rgba(6,8,13,0.92)',
            backdropFilter: 'blur(24px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
          }}>
            {/* Light leak at top */}
            <div className="light-leak" style={{ height: '200px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }} />
            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5" style={{ color: 'var(--c9-cyan)' }} />
                <span className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--c9-cyan)' }}>
                  AI Analysis
                </span>
                {moments.length > 0 && (
                  <span className="text-xs data-readout" style={{ color: 'var(--text-tertiary)' }}>
                    {currentMoment >= 0 ? currentMoment + 1 : 0}/{moments.length}
                  </span>
                )}
              </div>
              <button
                onClick={handleStop}
                className="btn-tactical p-1.5"
                title="Close (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current narration */}
            <div className="relative z-10 px-5 py-4 min-h-[120px]" style={{ borderBottom: '1px solid var(--border-default)' }}>
              {currentMoment >= 0 && moments[currentMoment] ? (
                <motion.div
                  key={currentMoment}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <span className="data-readout text-xs" style={{ color: 'var(--c9-cyan)' }}>
                    [{snapshots[currentMoment]?.time_ms ?? 0}ms]
                  </span>
                  <div className="mt-2">
                    <Markdown>{resolveNarrationNames(moments[currentMoment].narration)}</Markdown>
                  </div>
                </motion.div>
              ) : isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  >
                    <Film className="w-6 h-6" style={{ color: 'var(--c9-cyan)' }} />
                  </motion.div>
                  <div className="text-sm font-medium" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--c9-cyan)' }}>
                    Analyzing round...
                  </div>
                  <div className="w-full space-y-2 mt-1">
                    <motion.div
                      className="h-2.5 rounded-sm"
                      style={{ background: 'var(--bg-elevated)' }}
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                    <motion.div
                      className="h-2.5 rounded-sm w-3/4"
                      style={{ background: 'var(--bg-elevated)' }}
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
                    />
                    <motion.div
                      className="h-2.5 rounded-sm w-1/2"
                      style={{ background: 'var(--bg-elevated)' }}
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: 0.6 }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm italic" style={{ color: 'var(--text-tertiary)' }}>
                  Ready
                </div>
              )}
            </div>

            {/* Moment dots (clickable) */}
            <div className="relative z-10 flex gap-1.5 px-5 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
              {moments.map((_, i) => (
                <button
                  key={i}
                  onClick={() => seekToMoment(i)}
                  className="h-2 flex-1 transition-colors cursor-pointer hover:opacity-80"
                  style={{
                    background: i === currentMoment
                      ? 'var(--c9-cyan)'
                      : i < currentMoment
                      ? 'rgba(0,174,239,0.4)'
                      : 'var(--bg-elevated)',
                    clipPath: 'var(--clip-corner-sm)',
                    boxShadow: i === currentMoment ? '0 0 8px rgba(0,174,239,0.4)' : 'none',
                  }}
                  title={`Moment ${i + 1}`}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="relative z-10 flex items-center justify-center gap-3 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <button
                onClick={handleStop}
                className="btn-tactical p-2"
                title="Stop"
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const prev = Math.max(currentMoment - 1, 0);
                  seekToMoment(prev);
                }}
                disabled={currentMoment <= 0}
                className="btn-tactical p-2 disabled:opacity-30"
                title="Previous"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={isPlaying ? pause : play}
                className="p-3"
                style={{
                  background: 'var(--c9-cyan)',
                  clipPath: 'var(--clip-corner-sm)',
                  color: '#000',
                }}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button
                onClick={() => {
                  const next = Math.min(currentMoment + 1, moments.length - 1);
                  seekToMoment(next);
                }}
                disabled={currentMoment >= moments.length - 1}
                className="btn-tactical p-2 disabled:opacity-30"
                title="Next"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* All moments list (scrollable) */}
            <div className="relative z-10 flex-1 overflow-y-auto px-5 py-3 custom-scrollbar">
              <div className="text-xs uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-tertiary)' }}>All Moments</div>
              <div className="space-y-2">
                {moments.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => seekToMoment(i)}
                    className="w-full text-left p-3 transition-all text-sm"
                    style={{
                      background: i === currentMoment ? 'rgba(0,174,239,0.12)' : 'var(--bg-elevated)',
                      border: `1px solid ${i === currentMoment ? 'rgba(0,174,239,0.3)' : 'transparent'}`,
                      clipPath: 'var(--clip-corner-sm)',
                      color: i === currentMoment ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    <span className="data-readout text-xs mr-1" style={{ color: 'var(--c9-cyan)' }}>{i + 1}.</span>
                    {(() => { const t = resolveNarrationNames(m.narration); return t.length > 100 ? t.slice(0, 100) + '...' : t; })()}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="px-5 py-3 text-xs text-center" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--val-red)' }}>{error}</div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Re-open button when modal was closed but moments exist */}
      {!isModalOpen && moments.length > 0 && (
        <button
          onClick={() => { setIsModalOpen(true); setTheaterMode(true); }}
          className="btn-c9 w-full flex items-center justify-center gap-2 py-3 px-4 font-medium"
        >
          <Film className="w-5 h-5" />
          Resume AI Analysis
        </button>
      )}
      {typeof window !== 'undefined' && createPortal(modal, document.body)}
    </>
  );
}

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
} from 'lucide-react';
import { useSimulationStore } from '@/store/simulation';
import { useCameraStore } from '@/store/camera';
import { coachingApi } from '@/lib/api';
import { formatTime, TEAM_COLORS, PHASE_NAMES } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function SimulationControls() {
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

  const handleStart = async () => {
    if (status === 'idle') {
      await createSimulation();
    }
    if (status === 'created' || status === 'idle') {
      await startSimulation();
    }
  };

  return (
    <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      {/* Timer and Phase */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-gray-400 uppercase tracking-wider">Round Time</div>
          <div className="text-4xl font-mono font-bold text-white">
            {formatTime(currentTime)}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-400 uppercase tracking-wider">Phase</div>
          <div className="text-xl font-semibold text-white capitalize">
            {PHASE_NAMES[phase] ?? phase.replaceAll('_', ' ')}
          </div>
        </div>
      </div>

      {/* Team Stats */}
      <div className="flex items-center justify-between mb-6 gap-4">
        {/* Attack Team */}
        <div
          className="flex-1 rounded-xl p-4"
          style={{ backgroundColor: TEAM_COLORS.attack.bg }}
        >
          <div className="text-sm text-red-400 uppercase tracking-wider mb-1">
            Attack
          </div>
          <div className="flex items-center gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-3 h-3 rounded-full transition-all',
                  i < attackAlive ? 'bg-red-500' : 'bg-gray-600'
                )}
              />
            ))}
            <span className="ml-2 text-2xl font-bold text-white">
              {attackAlive}
            </span>
          </div>
        </div>

        {/* VS */}
        <div className="text-2xl font-bold text-gray-500">VS</div>

        {/* Defense Team */}
        <div
          className="flex-1 rounded-xl p-4"
          style={{ backgroundColor: TEAM_COLORS.defense.bg }}
        >
          <div className="text-sm text-blue-400 uppercase tracking-wider mb-1">
            Defense
          </div>
          <div className="flex items-center gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-3 h-3 rounded-full transition-all',
                  i < defenseAlive ? 'bg-blue-500' : 'bg-gray-600'
                )}
              />
            ))}
            <span className="ml-2 text-2xl font-bold text-white">
              {defenseAlive}
            </span>
          </div>
        </div>
      </div>

      {/* Spike Status */}
      {spikePlanted && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3"
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <Zap className="w-6 h-6 text-red-500" />
          </motion.div>
          <div>
            <div className="text-red-400 font-semibold">SPIKE PLANTED</div>
            <div className="text-sm text-red-300/70">Defuse or eliminate attackers</div>
          </div>
        </motion.div>
      )}

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={reset}
          className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          title="Reset"
        >
          <RotateCcw className="w-5 h-5 text-gray-400" />
        </button>

        {status === 'idle' || status === 'created' ? (
          <button
            onClick={handleStart}
            disabled={isLoading}
            className="p-4 rounded-full bg-green-500 hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            <Play className="w-8 h-8 text-white" />
          </button>
        ) : (
          <button
            onClick={togglePlayback}
            disabled={status === 'completed'}
            className={cn(
              'p-4 rounded-full transition-colors',
              isPlaying
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : 'bg-green-500 hover:bg-green-600',
              status === 'completed' && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white" />
            )}
          </button>
        )}

        <button
          onClick={() => tickSimulation(10)}
          disabled={status !== 'running'}
          className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
          title="Skip 10 ticks"
        >
          <SkipForward className="w-5 h-5 text-gray-400" />
        </button>

        <button
          onClick={runToCompletion}
          disabled={status !== 'running' || isLoading}
          className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
          title="Run to completion"
        >
          <FastForward className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Speed Controls */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm text-gray-400 mr-2">Playback Speed:</span>
        {[0.5, 1, 2, 4].map((speed) => (
          <button
            key={speed}
            onClick={() => setPlaybackSpeed(speed)}
            title={`${speed}x playback speed`}
            className={cn(
              'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
              playbackSpeed === speed
                ? 'bg-blue-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            )}
          >
            {speed}x
          </button>
        ))}
      </div>

      {/* AI Commentary Toggle */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-gray-400">Live AI Commentary</span>
        </div>
        <button
          onClick={() => setAiCommentaryEnabled(!aiCommentaryEnabled)}
          title="Pause at kills for AI analysis"
          className={cn(
            'relative w-10 h-5 rounded-full transition-colors',
            aiCommentaryEnabled ? 'bg-purple-500' : 'bg-gray-600'
          )}
        >
          <div
            className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
              aiCommentaryEnabled ? 'translate-x-5' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>
      <span className="text-xs text-gray-500">Pauses at kills for AI tactical breakdown</span>

      {/* Live Narration Card (Mode A: pause at key moments) */}
      <AnimatePresence>
        {liveNarrationPaused && liveNarrationText && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 bg-purple-500/15 border border-purple-500/30 rounded-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-purple-400 uppercase tracking-wider font-semibold">AI Commentary</span>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed mb-3">{liveNarrationText}</p>
            <button
              onClick={continueLiveNarration}
              className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Continue
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snapshot Timeline */}
      {snapshots.length > 0 && (
        <div className="mt-4">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Key Moments</div>
          <div className="relative h-2 bg-white/10 rounded-full">
            {snapshots.map((snap, i) => {
              const pct = Math.min((snap.time_ms / 100000) * 100, 100);
              const isKill = snap.label?.startsWith('kill');
              const isPlant = snap.label?.startsWith('spike_plant');
              return (
                <div
                  key={snap.id}
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-black/50',
                    isKill ? 'bg-red-500' : isPlant ? 'bg-yellow-400' : 'bg-gray-400'
                  )}
                  style={{ left: `${pct}%` }}
                  title={snap.label || `${snap.time_ms}ms`}
                />
              );
            })}
            {/* Current time indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-full"
              style={{ left: `${Math.min((currentTime / 100000) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Status */}
      {status === 'completed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl text-center"
        >
          <div className="text-xl font-bold text-white">
            {attackAlive > 0 && !spikePlanted
              ? 'Time Expired - Defense Wins'
              : attackAlive > 0
              ? 'Attack Wins'
              : 'Defense Wins'}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Round completed in {formatTime(currentTime)}
          </div>
        </motion.div>
      )}

    </div>
  );
}

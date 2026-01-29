'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  SkipForward,
  Zap,
} from 'lucide-react';
import { useSimulationStore } from '@/store/simulation';
import { formatTime, TEAM_COLORS } from '@/lib/utils';
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
    createSimulation,
    startSimulation,
    tickSimulation,
    pauseSimulation,
    togglePlayback,
    setPlaybackSpeed,
    reset,
  } = useSimulationStore();

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
            {phase.replaceAll('_', ' ')}
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
      </div>

      {/* Speed Controls */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm text-gray-400 mr-2">Speed:</span>
        {[0.5, 1, 2, 4].map((speed) => (
          <button
            key={speed}
            onClick={() => setPlaybackSpeed(speed)}
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

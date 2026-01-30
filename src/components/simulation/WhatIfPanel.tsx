'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Play, RotateCcw, User, Brain, AlertTriangle } from 'lucide-react';
import { useSimulationStore } from '@/store/simulation';
import { simulationsApi } from '@/lib/api';
import { WhatIfComparisonView } from './WhatIfComparisonView';
import { useC9Prediction, useMistakeAnalysis } from '@/hooks';
import { Markdown } from '@/components/ui/Markdown';

interface Snapshot {
  id: string;
  time_ms: number;
  phase: string;
  spike_planted: boolean;
  spike_site: string | null;
  player_count: { attack: number; defense: number };
}

interface WhatIfPanelProps {
  snapshots: Snapshot[];
}

export function WhatIfPanel({ snapshots }: WhatIfPanelProps) {
  const { sessionId, positions, status, mapName, phase, attackTeamId, defenseTeamId } = useSimulationStore();
  const [selectedSnapshot, setSelectedSnapshot] = useState<number>(0);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [modification, setModification] = useState<'survive' | 'reposition' | 'eco' | 'swap_sides'>('survive');
  const [nlInput, setNlInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  // Comparison view state
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonProps, setComparisonProps] = useState<{
    snapshotTimeMs: number;
    modifications: Record<string, Record<string, unknown>>;
  } | null>(null);

  // Coaching hooks
  const c9Prediction = useC9Prediction();
  const mistakeAnalysis = useMistakeAnalysis();

  // Fallback: load snapshots from API if store is empty after completion
  const storeSnapshots = useSimulationStore((s) => s.snapshots);
  useEffect(() => {
    if (sessionId && status === 'completed' && storeSnapshots.length === 0) {
      simulationsApi.getSnapshots(sessionId).then((resp) => {
        // Snapshots loaded — parent will re-render with new props
      }).catch(() => {});
    }
  }, [sessionId, status, storeSnapshots.length]);

  const deadPlayers = positions.filter(p => !p.is_alive);
  const alivePlayers = positions.filter(p => p.is_alive);

  const runWhatIf = useCallback(async () => {
    const needsPlayer = modification !== 'eco' && modification !== 'swap_sides';
    if (!sessionId || (needsPlayer && !selectedPlayer)) return;
    setIsRunning(true);
    setResult(null);

    try {
      const snapshot = snapshots[selectedSnapshot];
      const modifications: Record<string, Record<string, unknown>> = {};

      if (modification === 'survive' && selectedPlayer) {
        modifications[selectedPlayer] = { is_alive: true, health: 100 };
      } else if (modification === 'reposition' && selectedPlayer) {
        const player = positions.find(p => p.player_id === selectedPlayer);
        if (player) {
          modifications[selectedPlayer] = {
            x: Math.max(0.05, Math.min(0.95, player.x + (Math.random() - 0.5) * 0.15)),
            y: Math.max(0.05, Math.min(0.95, player.y + (Math.random() - 0.5) * 0.15)),
          };
        }
      }

      const snapshotTimeMs = snapshot?.time_ms ?? 0;

      // Show comparison view instead of basic result
      setComparisonProps({ snapshotTimeMs, modifications });
      setShowComparison(true);

      // Also run the basic what-if for fallback result
      const response = await simulationsApi.runWhatIf(sessionId, {
        snapshot_time_ms: snapshotTimeMs,
        modifications,
        ...(modification === 'eco' ? { round_type_override: 'eco' } : {}),
        ...(modification === 'swap_sides' ? { swap_sides: true } : {}),
      });

      const data = response.data;
      const attackAlive = data.positions.filter(p => p.side === 'attack' && p.is_alive).length;
      const defenseAlive = data.positions.filter(p => p.side === 'defense' && p.is_alive).length;

      setResult({
        attackAlive,
        defenseAlive,
        winner: attackAlive === 0 ? 'defense' : defenseAlive === 0 ? 'attack' : 'ongoing',
        spikePlanted: data.spike_planted,
        duration: data.current_time_ms,
      });
    } catch (err) {
      console.error('What-if error:', err);
    } finally {
      setIsRunning(false);
    }
  }, [sessionId, selectedPlayer, selectedSnapshot, modification, positions, snapshots]);

  return (
    <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-white">What If?</h3>
      </div>

      {/* Snapshot selector */}
      {snapshots.length > 0 && (
        <div className="mb-4">
          <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">
            Branch from moment
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {snapshots.map((snap, i) => (
              <button
                key={snap.id}
                onClick={() => setSelectedSnapshot(i)}
                className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                  selectedSnapshot === i
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {Math.floor(snap.time_ms / 1000)}s
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Player selector */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">
          Select player
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {[...deadPlayers, ...alivePlayers.slice(0, 4)].map((player) => (
            <button
              key={player.player_id}
              onClick={() => setSelectedPlayer(player.player_id)}
              className={`flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                selectedPlayer === player.player_id
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              <User className="w-3 h-3" />
              <span className="truncate">{player.name ?? player.player_id.split('_').pop()}</span>
              {!player.is_alive && <span className="text-red-400">&#x2620;</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Modification type */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">
          Modification
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setModification('survive')}
            className={`py-2 text-xs rounded-lg border transition-colors ${
              modification === 'survive'
                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}
          >
            Survive
          </button>
          <button
            onClick={() => setModification('reposition')}
            className={`py-2 text-xs rounded-lg border transition-colors ${
              modification === 'reposition'
                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}
          >
            Reposition
          </button>
          <button
            onClick={() => setModification('eco')}
            className={`py-2 text-xs rounded-lg border transition-colors ${
              modification === 'eco'
                ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}
          >
            Eco Buy
          </button>
          <button
            onClick={() => setModification('swap_sides')}
            className={`py-2 text-xs rounded-lg border transition-colors ${
              modification === 'swap_sides'
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}
          >
            Swap Sides
          </button>
        </div>
      </div>

      {/* Natural language input */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">
          Or describe in natural language
        </label>
        <input
          type="text"
          value={nlInput}
          onChange={(e) => setNlInput(e.target.value)}
          placeholder="e.g. What if xeppa survived the first duel?"
          className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isRunning) runWhatIf();
          }}
        />
      </div>

      {/* Run button */}
      <button
        onClick={runWhatIf}
        disabled={isRunning || (modification !== 'eco' && modification !== 'swap_sides' && !selectedPlayer)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        {isRunning ? (
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
            <RotateCcw className="w-4 h-4" />
          </motion.div>
        ) : (
          <Play className="w-4 h-4" />
        )}
        {isRunning ? 'Simulating...' : 'Run What-If'}
      </button>

      {/* Comparison View */}
      <AnimatePresence>
        {showComparison && comparisonProps && (
          <div className="mt-4">
            <WhatIfComparisonView
              snapshotTimeMs={comparisonProps.snapshotTimeMs}
              modifications={comparisonProps.modifications}
              onClose={() => setShowComparison(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Coaching Follow-up Actions */}
      <AnimatePresence>
        {result && !showComparison && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 space-y-2"
          >
            {/* Basic result fallback */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-center mb-2">
                <span className={`text-lg font-bold ${
                  result.winner === 'attack' ? 'text-red-400' : 'text-blue-400'
                }`}>
                  {(result.winner as string)?.toUpperCase()} WINS
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>ATK: {result.attackAlive as number} alive</span>
                <span>DEF: {result.defenseAlive as number} alive</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coaching actions — shown after any result */}
      {(result || showComparison) && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              c9Prediction.mutate({
                mapName,
                side: 'attack',
                phase,
                opponentTeam: defenseTeamId,
              });
            }}
            disabled={c9Prediction.isPending}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
          >
            <Brain className="w-3.5 h-3.5" />
            {c9Prediction.isPending ? 'Predicting...' : 'Predict C9 Action'}
          </button>
          <button
            onClick={() => {
              const snap = snapshots[selectedSnapshot];
              const desc = `${modification} scenario at ${snap?.time_ms ?? 0}ms on ${mapName}, phase: ${phase}`;
              mistakeAnalysis.mutate(desc);
            }}
            disabled={mistakeAnalysis.isPending}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {mistakeAnalysis.isPending ? 'Analyzing...' : 'Analyze Mistake'}
          </button>
        </div>
      )}

      {/* C9 Prediction Result */}
      {c9Prediction.data && (
        <div className="mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="text-xs text-blue-400 uppercase tracking-wider mb-1">C9 Prediction</div>
          <div className="text-sm text-white font-medium">{c9Prediction.data.primary_action}</div>
          <div className="text-xs mt-1"><Markdown>{c9Prediction.data.reasoning}</Markdown></div>
          <div className="text-xs text-blue-300 mt-1">
            Confidence: {Math.round(c9Prediction.data.confidence * 100)}% &middot; Key: {c9Prediction.data.key_player}
          </div>
        </div>
      )}

      {/* Mistake Analysis Result */}
      {mistakeAnalysis.data && (
        <div className="mt-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <div className="text-xs text-orange-400 uppercase tracking-wider mb-1">
            Mistake Analysis — {mistakeAnalysis.data.gravity_level}
          </div>
          <div className="text-sm text-white font-medium">{mistakeAnalysis.data.description}</div>
          <div className="text-xs mt-1"><Markdown>{mistakeAnalysis.data.correct_play}</Markdown></div>
        </div>
      )}
    </div>
  );
}

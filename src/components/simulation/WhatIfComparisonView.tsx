'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ArrowLeftRight, Loader2, Trophy } from 'lucide-react';
import { Markdown } from '@/components/ui/Markdown';
import { useSimulationStore } from '@/store/simulation';
import { api } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface ComparisonResult {
  original: {
    winner: string;
    attack_alive: number;
    defense_alive: number;
    spike_planted: boolean;
    total_kills?: number;
  };
  what_if: {
    winner: string;
    attack_alive: number;
    defense_alive: number;
    spike_planted: boolean;
    total_kills?: number;
  };
  key_differences?: string[];
  explanation?: string;
}

interface WhatIfComparisonViewProps {
  snapshotTimeMs: number;
  modifications: Record<string, Record<string, unknown>>;
  onClose: () => void;
}

export function WhatIfComparisonView({
  snapshotTimeMs,
  modifications,
  onClose,
}: WhatIfComparisonViewProps) {
  const { sessionId, mapName } = useSimulationStore();
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  const runComparison = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);

    try {
      const response = await api.post(`/simulations/${sessionId}/compare`, {
        snapshot_time_ms: snapshotTimeMs,
        modifications,
      });

      setComparison(response.data);

      // Get AI explanation
      try {
        const explainResponse = await api.post('/coaching/what-if/explain', {
          original: response.data.original,
          what_if: response.data.what_if,
          modifications,
          map_name: mapName,
        });
        setExplanation(explainResponse.data.explanation);
      } catch {
        // Explanation is optional
      }
    } catch (err) {
      console.error('Comparison error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, snapshotTimeMs, modifications, mapName]);

  // Auto-run on mount
  useState(() => {
    runComparison();
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-black/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Scenario Comparison</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">
          Close
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      ) : comparison ? (
        <>
          {/* Side by side */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* Original */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Original</div>
              <div className={`text-xl font-bold mb-2 ${
                comparison.original.winner === 'attack' ? 'text-red-400' : 'text-blue-400'
              }`}>
                {comparison.original.winner.toUpperCase()}
              </div>
              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>ATK alive</span>
                  <span className="text-white">{comparison.original.attack_alive}</span>
                </div>
                <div className="flex justify-between">
                  <span>DEF alive</span>
                  <span className="text-white">{comparison.original.defense_alive}</span>
                </div>
                <div className="flex justify-between">
                  <span>Spike</span>
                  <span className="text-white">{comparison.original.spike_planted ? 'Planted' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* What-if */}
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <div className="text-xs text-cyan-400 uppercase tracking-wider mb-2">What If</div>
              <div className={`text-xl font-bold mb-2 ${
                comparison.what_if.winner === 'attack' ? 'text-red-400' : 'text-blue-400'
              }`}>
                {comparison.what_if.winner.toUpperCase()}
              </div>
              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>ATK alive</span>
                  <span className="text-white">{comparison.what_if.attack_alive}</span>
                </div>
                <div className="flex justify-between">
                  <span>DEF alive</span>
                  <span className="text-white">{comparison.what_if.defense_alive}</span>
                </div>
                <div className="flex justify-between">
                  <span>Spike</span>
                  <span className="text-white">{comparison.what_if.spike_planted ? 'Planted' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Winner badge with bounce */}
          {comparison.original.winner !== comparison.what_if.winner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: [0.5, 1.15, 1] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="mb-4 p-3 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-center flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-semibold text-sm">
                Outcome Changed!
              </span>
            </motion.div>
          )}

          {/* Key differences */}
          {comparison.key_differences && comparison.key_differences.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Key Differences</div>
              <ul className="space-y-1">
                {comparison.key_differences.map((diff, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="text-sm text-gray-300 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                    {diff}
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Explanation */}
          {explanation && (
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="text-xs text-purple-400 uppercase tracking-wider mb-2">
                AI Analysis
              </div>
              <Markdown>{explanation}</Markdown>
            </div>
          )}
        </>
      ) : null}
    </motion.div>
  );
}

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { BarChart3, Play, Loader2 } from 'lucide-react';
import { useSimulationStore } from '@/store/simulation';
import { api } from '@/lib/api';

interface MonteCarloResult {
  attack_wins: number;
  defense_wins: number;
  attack_win_rate: number;
  defense_win_rate: number;
  total: number;
  iterations: Array<{
    iteration: number;
    winner: string;
    duration_ms: number;
    spike_planted: boolean;
    kills: number;
  }>;
}

export function MonteCarloPanel() {
  const { sessionId, status } = useSimulationStore();
  const [iterations, setIterations] = useState(20);
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  // GSAP counter refs
  const atkCounterRef = useRef<HTMLSpanElement>(null);
  const defCounterRef = useRef<HTMLSpanElement>(null);
  const dotsContainerRef = useRef<HTMLDivElement>(null);

  // GSAP animate counters when result arrives
  useEffect(() => {
    if (!result) return;
    const atkTarget = result.attack_win_rate * 100;
    const defTarget = result.defense_win_rate * 100;
    const atkProxy = { val: 0 };
    const defProxy = { val: 0 };

    if (atkCounterRef.current) {
      gsap.to(atkProxy, {
        val: atkTarget,
        duration: 1.2,
        ease: 'power2.out',
        snap: { val: 1 },
        onUpdate: () => {
          if (atkCounterRef.current) atkCounterRef.current.textContent = `${Math.round(atkProxy.val)}%`;
        },
      });
    }
    if (defCounterRef.current) {
      gsap.to(defProxy, {
        val: defTarget,
        duration: 1.2,
        ease: 'power2.out',
        snap: { val: 1 },
        onUpdate: () => {
          if (defCounterRef.current) defCounterRef.current.textContent = `${Math.round(defProxy.val)}%`;
        },
      });
    }

    // GSAP staggered dots
    if (dotsContainerRef.current) {
      const dots = dotsContainerRef.current.children;
      gsap.from(dots, {
        scale: 0,
        opacity: 0,
        stagger: 0.05,
        duration: 0.3,
        ease: 'back.out(1.7)',
      });
    }
  }, [result]);

  const runMonteCarlo = useCallback(async () => {
    if (!sessionId) return;
    setIsRunning(true);
    setResult(null);
    setProgress(0);

    // Simulate progress bar (MC endpoint doesn't stream progress, but we estimate)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + (90 - prev) * 0.1;
      });
    }, 200);

    try {
      const response = await api.post(
        `/simulations/${sessionId}/monte-carlo?iterations=${iterations}`
      );
      clearInterval(progressInterval);
      setProgress(100);
      setResult(response.data);
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Monte Carlo error:', err);
    } finally {
      setIsRunning(false);
    }
  }, [sessionId, iterations]);

  return (
    <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-orange-400" />
        <h3 className="text-lg font-semibold text-white">Monte Carlo</h3>
      </div>

      {/* Iteration selector */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">
          Iterations
        </label>
        <div className="flex gap-2">
          {[10, 20, 50].map((n) => (
            <button
              key={n}
              onClick={() => setIterations(n)}
              className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                iterations === n
                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
            >
              {n}x
            </button>
          ))}
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={runMonteCarlo}
        disabled={isRunning || !sessionId || status !== 'completed'}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        {isRunning ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        {isRunning ? 'Running...' : 'Run Analysis'}
      </button>

      {/* Animated progress bar during run */}
      {isRunning && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Simulating {iterations} rounds...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-600 to-yellow-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 space-y-3"
          >
            {/* Win rates with GSAP counters */}
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-xs text-gray-400 mb-2">Win Rate ({result.total} sims)</div>

              {/* Attack bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-red-400">Attack</span>
                  <span ref={atkCounterRef} className="text-white font-mono">0%</span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.attack_win_rate * 100}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                  />
                </div>
              </div>

              {/* Defense bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400">Defense</span>
                  <span ref={defCounterRef} className="text-white font-mono">0%</span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.defense_win_rate * 100}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* Staggered iteration dots (GSAP) */}
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-xs text-gray-400 mb-2">Per-Run Results</div>
              <div ref={dotsContainerRef} className="flex flex-wrap gap-1.5">
                {result.iterations.map((iter) => (
                  <div
                    key={iter.iteration}
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
                      iter.winner === 'attack'
                        ? 'bg-red-500/80 text-red-100'
                        : 'bg-blue-500/80 text-blue-100'
                    }`}
                    title={`#${iter.iteration}: ${iter.winner} (${Math.floor(iter.duration_ms / 1000)}s, ${iter.kills}K)`}
                  >
                    {iter.winner === 'attack' ? 'A' : 'D'}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-white/5 text-center">
                <div className="text-xs text-gray-400">Avg Duration</div>
                <div className="text-sm font-mono text-white">
                  {Math.floor(
                    result.iterations.reduce((a, b) => a + b.duration_ms, 0) /
                      result.iterations.length /
                      1000
                  )}s
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white/5 text-center">
                <div className="text-xs text-gray-400">Spike Plant %</div>
                <div className="text-sm font-mono text-white">
                  {(
                    (result.iterations.filter((i) => i.spike_planted).length / result.total) *
                    100
                  ).toFixed(0)}%
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

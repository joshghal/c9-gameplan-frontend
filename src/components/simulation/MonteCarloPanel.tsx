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
    <div className="hud-panel hud-panel-cyan p-5">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-4 h-4" style={{ color: 'var(--c9-cyan)' }} />
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--c9-cyan)' }}>Win Probability</h3>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>Re-run this round multiple times to estimate each side&apos;s win rate</p>

      {/* Iteration selector */}
      <div className="mb-4">
        <label className="text-xs uppercase tracking-widest mb-1 block" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>
          Simulations
        </label>
        <div className="flex gap-1.5">
          {[10, 20, 50].map((n) => (
            <button
              key={n}
              onClick={() => setIterations(n)}
              className="flex-1 py-1.5 text-xs transition-all"
              style={{
                background: iterations === n ? 'rgba(0,174,239,0.12)' : 'var(--bg-elevated)',
                border: `1px solid ${iterations === n ? 'var(--c9-cyan)' : 'var(--border-default)'}`,
                color: iterations === n ? 'var(--c9-cyan)' : 'var(--text-secondary)',
                clipPath: 'var(--clip-corner-sm)',
                fontFamily: 'var(--font-jetbrains-mono)',
              }}
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
        className="btn-c9 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {isRunning ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        {isRunning ? 'Simulating...' : 'Run Simulations'}
      </button>

      {/* Animated progress bar during run */}
      {isRunning && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
            <span>Simulating {iterations} rounds...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden" style={{ background: 'var(--bg-elevated)', clipPath: 'var(--clip-corner-sm)' }}>
            <motion.div
              className="h-full"
              style={{ background: 'linear-gradient(90deg, var(--c9-cyan), var(--c9-cyan))' }}
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
            <div className="p-3" style={{ background: 'var(--bg-elevated)', clipPath: 'var(--clip-corner-sm)' }}>
              <div className="text-xs mb-2 data-readout" style={{ color: 'var(--text-secondary)' }}>Win Rate ({result.total} sims)</div>

              {/* Attack bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--val-red)', fontFamily: 'var(--font-rajdhani)' }}>Attack</span>
                  <span ref={atkCounterRef} className="data-readout" style={{ color: 'var(--val-red)' }}>0%</span>
                </div>
                <div className="h-2 overflow-hidden" style={{ background: 'var(--bg-primary)', clipPath: 'var(--clip-corner-sm)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.attack_win_rate * 100}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="h-full"
                    style={{ background: 'var(--val-red)', boxShadow: '0 0 8px rgba(255,70,84,0.4)' }}
                  />
                </div>
              </div>

              {/* Defense bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--val-teal)', fontFamily: 'var(--font-rajdhani)' }}>Defense</span>
                  <span ref={defCounterRef} className="data-readout" style={{ color: 'var(--val-teal)' }}>0%</span>
                </div>
                <div className="h-2 overflow-hidden" style={{ background: 'var(--bg-primary)', clipPath: 'var(--clip-corner-sm)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.defense_win_rate * 100}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="h-full"
                    style={{ background: 'var(--val-teal)', boxShadow: '0 0 8px rgba(18,212,180,0.4)' }}
                  />
                </div>
              </div>
            </div>

            {/* Staggered iteration dots (GSAP) */}
            <div className="p-3" style={{ background: 'var(--bg-elevated)', clipPath: 'var(--clip-corner-sm)' }}>
              <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>Per-Run Results</div>
              <div ref={dotsContainerRef} className="flex flex-wrap gap-1.5">
                {result.iterations.map((iter) => (
                  <div
                    key={iter.iteration}
                    className="w-4 h-4 flex items-center justify-center text-[8px] font-bold"
                    style={{
                      background: iter.winner === 'attack' ? 'rgba(255,70,84,0.6)' : 'rgba(18,212,180,0.6)',
                      color: iter.winner === 'attack' ? 'var(--val-red)' : 'var(--val-teal)',
                      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                    }}
                    title={`#${iter.iteration}: ${iter.winner} (${Math.floor(iter.duration_ms / 1000)}s, ${iter.kills}K)`}
                  >
                    {iter.winner === 'attack' ? 'A' : 'D'}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 text-center" style={{ background: 'var(--bg-elevated)', clipPath: 'var(--clip-corner-sm)' }}>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-rajdhani)' }}>Avg Duration</div>
                <div className="data-readout text-sm" style={{ color: 'var(--text-primary)' }}>
                  {Math.floor(
                    result.iterations.reduce((a, b) => a + b.duration_ms, 0) /
                      result.iterations.length /
                      1000
                  )}s
                </div>
              </div>
              <div className="p-2 text-center" style={{ background: 'var(--bg-elevated)', clipPath: 'var(--clip-corner-sm)' }}>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-rajdhani)' }}>Spike Plant %</div>
                <div className="data-readout text-sm" style={{ color: 'var(--text-primary)' }}>
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

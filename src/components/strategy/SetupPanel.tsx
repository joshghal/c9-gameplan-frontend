'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Swords, Shield, Users, ArrowRight, Loader2 } from 'lucide-react';
import { strategyApi } from '@/lib/strategy-api';
import { useStrategyStore } from '@/store/strategy';

const MAP_DISPLAY: Record<string, string> = {
  abyss: 'Abyss', ascent: 'Ascent', bind: 'Bind', corrode: 'Corrode',
  fracture: 'Fracture', haven: 'Haven', icebox: 'Icebox', lotus: 'Lotus',
  pearl: 'Pearl', split: 'Split', sunset: 'Sunset',
};

const MAP_WALLPAPERS = [
  'ascent', 'bind', 'breeze', 'fracture', 'haven', 'icebox',
  'lotus', 'pearl', 'split', 'sunset', 'abyss', 'corrode',
];

export function SetupPanel() {
  const { setRound, setPageState, setSelectedPlayerId, setIsLoading, setError, isLoading, error } = useStrategyStore();
  const [maps, setMaps] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [selectedSide, setSelectedSide] = useState<'attack' | 'defense'>('attack');
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    strategyApi.getMaps().then(setMaps).catch(() => setMaps(Object.keys(MAP_DISPLAY)));
  }, []);

  // Rotate wallpapers when no map selected
  useEffect(() => {
    if (selectedMap) return;
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % MAP_WALLPAPERS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [selectedMap]);

  const bgWallpaper = selectedMap || MAP_WALLPAPERS[bgIndex];

  const handleStart = async () => {
    if (!selectedMap) return;
    setIsLoading(true);
    setError(null);
    try {
      const round = await strategyApi.getRound(selectedMap, selectedSide);
      setRound(round);
      if (round.teammates.length > 0) {
        setSelectedPlayerId(round.teammates[0].player_id);
      }
      setPageState('planning');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load round');
    } finally {
      setIsLoading(false);
    }
  };

  const mapList = maps.length > 0 ? maps : Object.keys(MAP_DISPLAY);

  return (
    <div className="flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'var(--bg-abyss)', minHeight: 'calc(100vh - 57px)' }}>
      {/* Background wallpaper */}
      <AnimatePresence mode="sync">
        <motion.div
          key={bgWallpaper}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="absolute inset-0 z-0"
        >
          <img
            src={`/maps/wallpapers/${bgWallpaper}.png`}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.25) saturate(0.7)', transform: 'scale(1.05)' }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Atmospheric glow orbs */}
      <div className="glow-orb glow-orb-cyan" style={{ width: '600px', height: '600px', top: '5%', right: '10%', opacity: 0.4 }} />
      <div className="glow-orb glow-orb-cyan" style={{ width: '400px', height: '400px', bottom: '10%', left: '5%', opacity: 0.25 }} />

      {/* Light leak */}
      <div className="light-leak" />

      {/* Vignette */}
      <div className="absolute inset-0 z-10 pointer-events-none" style={{ boxShadow: 'inset 0 0 200px 60px rgba(0,0,0,0.6)' }} />

      {/* Surface texture */}
      <div className="absolute inset-0 surface-texture z-0" style={{ opacity: 0.5 }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl space-y-8 relative z-20 px-6 py-8"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-2"
        >
          <h1 className="text-5xl font-bold uppercase tracking-widest text-gradient-c9 mb-2" style={{ fontFamily: 'var(--font-rajdhani)' }}>
            Tactical Planner
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-share-tech-mono)' }}>
            Plan your team&apos;s movement across 4 phases, then execute against a pro VCT opponent
          </p>
        </motion.div>

        {/* Config card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="frosted-glass-heavy p-1"
          style={{ clipPath: 'var(--clip-corner)' }}
        >
          <div className="p-5 space-y-5">
            {/* Map Selection — Visual Gallery */}
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-3" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>
                <Map className="w-4 h-4" />
                <span className="font-semibold">Select Map</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {mapList.map((m) => {
                  const selected = selectedMap === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setSelectedMap(m)}
                      className="relative overflow-hidden transition-all group"
                      style={{
                        clipPath: 'var(--clip-corner-sm)',
                        border: selected ? '2px solid var(--c9-cyan)' : '2px solid transparent',
                        boxShadow: selected ? '0 0 12px rgba(0,174,239,0.3)' : 'none',
                      }}
                    >
                      <div className="aspect-[16/10] relative">
                        <img
                          src={`/maps/${m}.png`}
                          alt={MAP_DISPLAY[m] || m}
                          className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110"
                          style={{ filter: selected ? 'brightness(0.6)' : 'brightness(0.35)' }}
                        />
                        <div className="absolute inset-0" style={{
                          background: 'linear-gradient(to top, rgba(6,8,13,0.9) 0%, transparent 60%)',
                        }} />
                        {selected && (
                          <div className="absolute inset-0" style={{
                            background: 'linear-gradient(to top, rgba(0,174,239,0.15) 0%, transparent 50%)',
                          }} />
                        )}
                        <div className="absolute bottom-0 left-0 right-0 px-2 pb-1.5">
                          <span
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{
                              fontFamily: 'var(--font-rajdhani)',
                              color: selected ? 'var(--c9-cyan)' : 'var(--text-primary)',
                              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                            }}
                          >
                            {MAP_DISPLAY[m] || m}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Side Selection */}
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-3" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>
                <Users className="w-4 h-4" />
                <span className="font-semibold">Select Side</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedSide('attack')}
                  className="flex items-center justify-center gap-3 py-4 text-sm font-semibold transition-all"
                  style={{
                    background: selectedSide === 'attack' ? 'rgba(255,70,84,0.12)' : 'var(--bg-elevated)',
                    border: `1px solid ${selectedSide === 'attack' ? 'var(--val-red)' : 'var(--border-default)'}`,
                    color: selectedSide === 'attack' ? 'var(--val-red)' : 'var(--text-secondary)',
                    clipPath: 'var(--clip-corner)',
                    fontFamily: 'var(--font-rajdhani)',
                  }}
                >
                  <Swords className="w-5 h-5" />
                  Attack
                </button>
                <button
                  onClick={() => setSelectedSide('defense')}
                  className="flex items-center justify-center gap-3 py-4 text-sm font-semibold transition-all"
                  style={{
                    background: selectedSide === 'defense' ? 'rgba(18,212,180,0.12)' : 'var(--bg-elevated)',
                    border: `1px solid ${selectedSide === 'defense' ? 'var(--val-teal)' : 'var(--border-default)'}`,
                    color: selectedSide === 'defense' ? 'var(--val-teal)' : 'var(--text-secondary)',
                    clipPath: 'var(--clip-corner)',
                    fontFamily: 'var(--font-rajdhani)',
                  }}
                >
                  <Shield className="w-5 h-5" />
                  Defense
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={handleStart}
            disabled={!selectedMap || isLoading}
            className="btn-c9 w-full flex items-center justify-center gap-2 py-5 text-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontSize: '1.1rem' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Loading Round...
              </>
            ) : (
              <>
                Start Planning
                <ArrowRight className="w-6 h-6" />
              </>
            )}
          </button>
        </motion.div>

        {error && (
          <div className="text-center text-sm" style={{ color: 'var(--val-red)' }}>{error}</div>
        )}
      </motion.div>
    </div>
  );
}

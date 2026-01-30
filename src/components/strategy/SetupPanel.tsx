'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Map, Swords, Shield, Users, ArrowRight, Loader2 } from 'lucide-react';
import { strategyApi } from '@/lib/strategy-api';
import { useStrategyStore } from '@/store/strategy';

const MAP_DISPLAY: Record<string, string> = {
  abyss: 'Abyss', ascent: 'Ascent', bind: 'Bind', corrode: 'Corrode',
  fracture: 'Fracture', haven: 'Haven', icebox: 'Icebox', lotus: 'Lotus',
  pearl: 'Pearl', split: 'Split', sunset: 'Sunset',
};

export function SetupPanel() {
  const { setRound, setPageState, setSelectedPlayerId, setIsLoading, setError, isLoading, error } = useStrategyStore();
  const [maps, setMaps] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [selectedSide, setSelectedSide] = useState<'attack' | 'defense'>('attack');

  useEffect(() => {
    strategyApi.getMaps().then(setMaps).catch(() => setMaps(Object.keys(MAP_DISPLAY)));
  }, []);

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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Tactical Planner
          </h1>
          <p className="text-gray-400">
            Plan your team&apos;s movement across 4 phases, then execute against a pro VCT opponent
          </p>
        </div>

        {/* Map Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Map className="w-4 h-4" />
            <span className="uppercase tracking-wider font-semibold">Select Map</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(maps.length > 0 ? maps : Object.keys(MAP_DISPLAY)).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMap(m)}
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all border ${
                  selectedMap === m
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {MAP_DISPLAY[m] || m}
              </button>
            ))}
          </div>
        </div>

        {/* Side Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Users className="w-4 h-4" />
            <span className="uppercase tracking-wider font-semibold">Select Side</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedSide('attack')}
              className={`flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-medium transition-all border ${
                selectedSide === 'attack'
                  ? 'bg-red-500/20 border-red-500/50 text-red-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              <Swords className="w-5 h-5" />
              Attack
            </button>
            <button
              onClick={() => setSelectedSide('defense')}
              className={`flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-medium transition-all border ${
                selectedSide === 'defense'
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              <Shield className="w-5 h-5" />
              Defense
            </button>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={!selectedMap || isLoading}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading Round...
            </>
          ) : (
            <>
              Start Planning
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {error && (
          <div className="text-center text-red-400 text-sm">{error}</div>
        )}
      </motion.div>
    </div>
  );
}

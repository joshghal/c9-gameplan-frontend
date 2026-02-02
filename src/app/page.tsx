'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Loader2 } from 'lucide-react';

const MAP_WALLPAPERS = [
  'ascent', 'bind', 'breeze', 'fracture', 'haven', 'icebox',
  'lotus', 'pearl', 'split', 'sunset', 'abyss', 'corrode',
];
import {
  MapCanvas,
  SimulationControls,
  EventLog,
  ConfigPanel,
  CommandCenter,
} from '@/components/simulation';
import { useSimulationStore } from '@/store/simulation';

// ─── Film Grain SVG Filter (inline, no external file) ───
function FilmGrain() {
  return (
    <svg className="film-grain" width="100%" height="100%">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
}

// ─── IDLE STAGE: Mission Briefing ───
function IdleStage() {
  const { createSimulation, startSimulation, isLoading, mapName } = useSimulationStore();
  const [bgIndex, setBgIndex] = useState(0);

  // Rotate wallpapers every 6 seconds only when no map is selected
  useEffect(() => {
    if (mapName) return; // Stop rotating when a map is selected
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % MAP_WALLPAPERS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [mapName]);

  const bgWallpaper = mapName
    ? mapName.toLowerCase()
    : MAP_WALLPAPERS[bgIndex];

  const handleInitiate = async () => {
    await createSimulation();
    await startSimulation();
  };

  return (
    <motion.div
      key="idle"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-[calc(100vh-57px)] flex items-center justify-center overflow-hidden"
    >
      {/* Background: selected map wallpaper or rotating gallery */}
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

      {/* Atmospheric glow orbs — all C9 cyan */}
      <div className="glow-orb glow-orb-cyan" style={{ width: '600px', height: '600px', top: '10%', left: '15%', opacity: 0.4 }} />
      <div className="glow-orb glow-orb-cyan" style={{ width: '500px', height: '500px', bottom: '5%', right: '10%', opacity: 0.25 }} />
      <div className="glow-orb glow-orb-cyan" style={{ width: '300px', height: '300px', top: '60%', left: '50%', opacity: 0.15 }} />

      {/* Light leak */}
      <div className="light-leak" />

      {/* Vignette */}
      <div className="absolute inset-0 z-10 pointer-events-none" style={{ boxShadow: 'inset 0 0 200px 60px rgba(0,0,0,0.6)' }} />

      {/* Surface texture */}
      <div className="absolute inset-0 surface-texture z-0" style={{ opacity: 0.6 }} />

      {/* Center content */}
      <div className="relative z-20 w-full max-w-[680px] mx-auto px-6 py-12">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold uppercase tracking-widest text-gradient-c9 mb-2" style={{ fontFamily: 'var(--font-rajdhani)' }}>
            Simulation
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-share-tech-mono)' }}>
            Configure map, teams, and economy — simulate a full round using pro movement patterns, combat models, and positioning data derived from 590K+ VCT samples
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
          <ConfigPanel />
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <button
            onClick={handleInitiate}
            disabled={isLoading}
            className="btn-c9 w-full flex items-center justify-center gap-3 py-5 text-lg disabled:opacity-50"
            style={{ fontSize: '1.1rem' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Initiate Simulation
              </>
            )}
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── RUNNING STAGE: Tactical Operations ───
function RunningStage() {
  const { togglePlayback, reset: resetSim, runToCompletion, setPlaybackSpeed, mapName } = useSimulationStore();
  const [mapSize, setMapSize] = useState(800);

  // Square map that fits viewport (maps are 1:1 aspect ratio)
  useEffect(() => {
    const update = () => {
      const viewH = window.innerHeight - 57; // nav height
      const viewW = window.innerWidth;
      // Map is square; fit within viewport leaving room for bottom controls (~80px)
      setMapSize(Math.min(viewW, viewH - 80));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      switch (e.key) {
        case ' ': e.preventDefault(); togglePlayback(); break;
        case 'r': case 'R': resetSim(); break;
        case 'f': case 'F': runToCompletion(); break;
        case '1': setPlaybackSpeed(0.5); break;
        case '2': setPlaybackSpeed(1); break;
        case '3': setPlaybackSpeed(2); break;
        case '4': setPlaybackSpeed(4); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlayback, resetSim, runToCompletion, setPlaybackSpeed]);

  return (
    <motion.div
      key="running"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="relative"
      style={{ height: 'calc(100vh - 57px)' }}
    >
      {/* Map wallpaper background */}
      <img
        src={`/maps/wallpapers/${mapName?.toLowerCase() || 'ascent'}.png`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{ filter: 'brightness(0.2) saturate(0.6)' }}
      />

      {/* Atmospheric glow orbs */}
      <div className="absolute inset-0 pointer-events-none z-[1]">
        <div className="glow-orb glow-orb-cyan" style={{ width: '700px', height: '700px', top: '10%', left: '20%', opacity: 0.25 }} />
        <div className="glow-orb glow-orb-cyan" style={{ width: '500px', height: '500px', bottom: '10%', right: '15%', opacity: 0.2 }} />
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 z-[2] pointer-events-none" style={{ boxShadow: 'inset 0 0 200px 60px rgba(0,0,0,0.5)' }} />

      {/* Surface texture */}
      <div className="absolute inset-0 surface-texture z-[2] pointer-events-none" style={{ opacity: 0.4 }} />

      {/* Centered square map */}
      <div className="absolute inset-0 z-[5] flex items-center justify-center">
        <MapCanvas width={mapSize} height={mapSize} />
      </div>

      {/* Ambient edge glow */}
      <div className="absolute inset-0 edge-glow edge-glow-cyan z-10 pointer-events-none" />

      {/* Compact kill-feed (right edge, below MapCanvas internal HUD) */}
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="absolute top-16 right-4 w-72 z-[20]"
      >
        <EventLog variant="compact" />
      </motion.div>

      {/* Bottom controls overlay */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="absolute bottom-0 left-0 right-0 z-30"
      >
        <SimulationControls variant="overlay" />
      </motion.div>
    </motion.div>
  );
}

// ─── COMPLETED STAGE: After Action Report ───
function CompletedStage() {
  const {
    positions, events, spikePlanted, spikeSite, currentTime, snapshots,
    mapName, togglePlayback, reset: resetSim, setPlaybackSpeed,
  } = useSimulationStore();
  const [mapSize, setMapSize] = useState(600);

  const attackAlive = positions.filter((p) => p.side === 'attack' && p.is_alive).length;
  const defenseAlive = positions.filter((p) => p.side === 'defense' && p.is_alive).length;
  const attackWon = attackAlive > 0 || spikePlanted;

  // Responsive map
  useEffect(() => {
    const update = () => {
      const available = (window.innerHeight - 57) * 0.6;
      const w = window.innerWidth * 0.55;
      setMapSize(Math.min(w, available, 800));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      switch (e.key) {
        case ' ': e.preventDefault(); togglePlayback(); break;
        case 'r': case 'R': resetSim(); break;
        case '1': setPlaybackSpeed(0.5); break;
        case '2': setPlaybackSpeed(1); break;
        case '3': setPlaybackSpeed(2); break;
        case '4': setPlaybackSpeed(4); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlayback, resetSim, setPlaybackSpeed]);

  const finalState = {
    positions: positions.map(p => ({ player_id: p.player_id, name: p.name, side: p.side, is_alive: p.is_alive, agent: p.agent, team_id: p.team_id })),
    attack_alive: attackAlive,
    defense_alive: defenseAlive,
    spike_planted: spikePlanted,
    spike_site: spikeSite,
    duration_ms: currentTime,
    total_events: events.length,
  };

  return (
    <motion.div
      key="completed"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex"
      style={{ height: 'calc(100vh - 57px)' }}
    >
      {/* Left: Map + Controls */}
      <div className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        {/* Map wallpaper background */}
        <img
          src={`/maps/wallpapers/${mapName?.toLowerCase() || 'ascent'}.png`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ filter: 'brightness(0.25) saturate(0.7)' }}
        />
        {/* Atmospheric glow orbs */}
        <div className="absolute inset-0 pointer-events-none z-[1]">
          <div className="glow-orb glow-orb-cyan" style={{ width: '600px', height: '600px', top: '15%', left: '25%', opacity: 0.3 }} />
          <div className="glow-orb glow-orb-cyan" style={{ width: '400px', height: '400px', bottom: '15%', right: '10%', opacity: 0.2 }} />
        </div>
        {/* Light leak */}
        <div className="light-leak" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '250px', zIndex: 1 }} />
        {/* Vignette */}
        <div className="absolute inset-0 z-[2] pointer-events-none" style={{ boxShadow: 'inset 0 0 200px 60px rgba(0,0,0,0.5)' }} />
        {/* Surface texture */}
        <div className="absolute inset-0 surface-texture z-[2] pointer-events-none" style={{ opacity: 0.4 }} />

        {/* Fixed map (does not scroll) */}
        <div className="relative z-10 flex-shrink-0 flex justify-center pt-4 px-5">
          <MapCanvas width={mapSize} height={mapSize} />
        </div>

        {/* Scrollable controls below map */}
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 flex justify-center">
          <div className="w-full" style={{ maxWidth: mapSize }}>
            <SimulationControls />
          </div>
        </div>
      </div>

      {/* Right: AAR Panel */}
      <motion.div
        initial={{ x: 480, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-[440px] flex-shrink-0 overflow-y-auto relative"
        style={{
          borderLeft: '1px solid var(--border-default)',
          background: 'rgba(6,8,13,0.92)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        }}
      >
        {/* C9 light leak at top */}
        <div className="light-leak" style={{ height: '300px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }} />

        <div className="relative z-10 p-5 space-y-5">
          {/* Victory/Defeat Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="p-5 text-center"
            style={{
              background: 'rgba(0,174,239,0.06)',
              border: '1px solid rgba(0,174,239,0.2)',
              clipPath: 'var(--clip-corner)',
            }}
          >
            <div className="text-3xl font-bold uppercase tracking-widest" style={{
              fontFamily: 'var(--font-rajdhani)',
              color: 'var(--c9-cyan)',
            }}>
              {attackWon ? 'Attack Wins' : 'Defense Wins'}
            </div>
            <div className="text-sm mt-2 data-readout" style={{ color: 'var(--text-secondary)' }}>
              {attackAlive} ATK vs {defenseAlive} DEF &middot; {Math.round(currentTime / 1000)}s
            </div>
          </motion.div>

          {/* Command Center — unified AI coaching experience */}
          <CommandCenter snapshots={snapshots} finalState={finalState} />

          {/* Full Event Log */}
          <EventLog variant="full" />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── MAIN PAGE ───
export default function Home() {
  const { status } = useSimulationStore();

  const stage = status === 'idle' ? 'idle'
    : status === 'completed' ? 'completed'
    : 'running';

  return (
    <div className="relative" style={{ background: 'var(--bg-abyss)' }}>
      <FilmGrain />
      <AnimatePresence mode="wait">
        {stage === 'idle' && <IdleStage />}
        {stage === 'running' && <RunningStage />}
        {stage === 'completed' && <CompletedStage />}
      </AnimatePresence>
    </div>
  );
}

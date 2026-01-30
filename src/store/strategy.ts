import { create } from 'zustand';
import type { StrategyRound, StrategyResult, Waypoint } from '@/lib/strategy-api';

export type Phase = 'setup' | 'mid_round' | 'execute' | 'post_plant';
export const PHASES: Phase[] = ['setup', 'mid_round', 'execute', 'post_plant'];
export const PHASE_LABELS: Record<Phase, string> = {
  setup: 'Setup',
  mid_round: 'Mid-Round',
  execute: 'Execute',
  post_plant: 'Post-Plant',
};

export type PageState = 'setup' | 'planning' | 'results';

interface StrategyStore {
  // Page state
  pageState: PageState;
  setPageState: (s: PageState) => void;

  // Round data from backend
  round: StrategyRound | null;
  setRound: (r: StrategyRound) => void;

  // Planning state
  currentPhase: Phase;
  setCurrentPhase: (p: Phase) => void;
  selectedPlayerId: string | null;
  setSelectedPlayerId: (id: string | null) => void;

  // Waypoints: phase → player_id → Waypoint[]
  waypoints: Record<string, Record<string, Waypoint[]>>;
  addWaypoint: (phase: Phase, playerId: string, wp: Waypoint) => void;
  removeLastWaypoint: (phase: Phase, playerId: string) => void;
  clearWaypoints: () => void;

  // Facing mode: after placing position, next click sets facing direction
  facingMode: boolean;
  setFacingMode: (f: boolean) => void;

  // Ghost paths
  showGhosts: boolean;
  toggleGhosts: () => void;
  adoptGhostPath: (playerId: string) => void;
  adoptAllGhostPaths: () => void;

  // Results
  result: StrategyResult | null;
  setResult: (r: StrategyResult) => void;
  isReplay: boolean;
  setIsReplay: (v: boolean) => void;

  // Loading
  isLoading: boolean;
  setIsLoading: (l: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;

  // Reset
  reset: () => void;
}

const initialWaypoints: Record<string, Record<string, Waypoint[]>> = {};

export const useStrategyStore = create<StrategyStore>((set, get) => ({
  pageState: 'setup',
  setPageState: (s) => set({ pageState: s }),

  round: null,
  setRound: (r) => set({ round: r }),

  currentPhase: 'setup',
  setCurrentPhase: (p) => set({ currentPhase: p }),
  selectedPlayerId: null,
  setSelectedPlayerId: (id) => set({ selectedPlayerId: id }),

  waypoints: {},
  addWaypoint: (phase, playerId, wp) => set((state) => {
    const phaseWps = { ...(state.waypoints[phase] ?? {}) };
    const playerWps = [...(phaseWps[playerId] || []), wp];
    return {
      waypoints: {
        ...state.waypoints,
        [phase]: { ...phaseWps, [playerId]: playerWps },
      },
      facingMode: false,
    };
  }),
  removeLastWaypoint: (phase, playerId) => set((state) => {
    const phaseWps = { ...(state.waypoints[phase] ?? {}) };
    const playerWps = [...(phaseWps[playerId] || [])];
    playerWps.pop();
    return {
      waypoints: {
        ...state.waypoints,
        [phase]: { ...phaseWps, [playerId]: playerWps },
      },
    };
  }),
  clearWaypoints: () => set({ waypoints: {} }),

  facingMode: false,
  setFacingMode: (f) => set({ facingMode: f }),

  showGhosts: true,
  toggleGhosts: () => set((state) => ({ showGhosts: !state.showGhosts })),
  adoptGhostPath: (playerId: string) => set((state) => {
    const round = state.round;
    if (!round) return state;
    const ghost = round.ghost_paths.find((g) => g.player_id === playerId);
    if (!ghost) return state;

    const newWaypoints = { ...state.waypoints };
    for (const phase of PHASES) {
      const seg = ghost.segments[phase] ?? [];
      const phaseWps = { ...(newWaypoints[phase] ?? {}) };
      // Convert ghost points to waypoints (sample every 3rd for manageable count)
      const sampled = seg.filter((_, i) => i % 3 === 0 || i === seg.length - 1);
      phaseWps[playerId] = sampled.map((pt) => ({
        tick: Math.round(pt.time_s / 0.128),
        x: pt.x,
        y: pt.y,
        facing: 0,
      }));
      newWaypoints[phase] = phaseWps;
    }
    return { waypoints: newWaypoints };
  }),
  adoptAllGhostPaths: () => set((state) => {
    const round = state.round;
    if (!round) return state;

    const newWaypoints = { ...state.waypoints };
    for (const t of round.teammates) {
      const ghost = round.ghost_paths.find((g) => g.player_id === t.player_id);
      if (!ghost) continue;
      for (const phase of PHASES) {
        const seg = ghost.segments[phase] ?? [];
        const phaseWps = { ...(newWaypoints[phase] ?? {}) };
        const sampled = seg.filter((_, i) => i % 3 === 0 || i === seg.length - 1);
        phaseWps[t.player_id] = sampled.map((pt) => ({
          tick: Math.round(pt.time_s / 0.128),
          x: pt.x,
          y: pt.y,
          facing: 0,
        }));
        newWaypoints[phase] = phaseWps;
      }
    }
    return { waypoints: newWaypoints };
  }),

  result: null,
  setResult: (r) => set({ result: r }),
  isReplay: false,
  setIsReplay: (v) => set({ isReplay: v }),

  isLoading: false,
  setIsLoading: (l) => set({ isLoading: l }),
  error: null,
  setError: (e) => set({ error: e }),

  reset: () => set({
    pageState: 'setup',
    round: null,
    currentPhase: 'setup',
    selectedPlayerId: null,
    waypoints: {},
    facingMode: false,
    showGhosts: true,
    result: null,
    isReplay: false,
    isLoading: false,
    error: null,
  }),
}));

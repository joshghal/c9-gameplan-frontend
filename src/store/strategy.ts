import { create } from 'zustand';
import type {
  StrategyRound,
  StrategyResult,
  Waypoint,
  PhaseResult,
  PhaseCheckpoint,
} from '@/lib/strategy-api';
import { strategyApi } from '@/lib/strategy-api';

export type Phase = 'setup' | 'mid_round' | 'execute' | 'post_plant';
export const PHASES: Phase[] = ['setup', 'mid_round', 'execute', 'post_plant'];
export const PHASE_LABELS: Record<Phase, string> = {
  setup: 'Setup',
  mid_round: 'Mid-Round',
  execute: 'Execute',
  post_plant: 'Post-Plant',
};

export type PageState = 'setup' | 'planning' | 'phase-results' | 'final-results' | 'replay';

interface StrategyStore {
  // Page state
  pageState: PageState;
  setPageState: (s: PageState) => void;

  // Round data from backend
  round: StrategyRound | null;
  setRound: (r: StrategyRound) => void;

  // Planning state — now single-phase
  activePhase: Phase;
  setActivePhase: (p: Phase) => void;
  currentPhase: Phase;
  setCurrentPhase: (p: Phase) => void;
  selectedPlayerId: string | null;
  setSelectedPlayerId: (id: string | null) => void;

  // Waypoints: only for the active phase — player_id → Waypoint[]
  waypoints: Record<string, Record<string, Waypoint[]>>;
  addWaypoint: (phase: Phase, playerId: string, wp: Waypoint) => void;
  removeLastWaypoint: (phase: Phase, playerId: string) => void;
  clearWaypoints: () => void;

  // Facing mode
  facingMode: boolean;
  setFacingMode: (f: boolean) => void;

  // Ghost paths
  showGhosts: boolean;
  toggleGhosts: () => void;
  adoptGhostPath: (playerId: string) => void;
  adoptAllGhostPaths: () => void;

  // Phase-by-phase execution state
  executedPhases: Phase[];
  phaseResults: Partial<Record<Phase, PhaseResult>>;
  currentCheckpoint: PhaseCheckpoint | null;

  // Legacy results (replay / old execute)
  result: StrategyResult | null;
  setResult: (r: StrategyResult) => void;
  isReplay: boolean;
  setIsReplay: (v: boolean) => void;

  // Loading
  isLoading: boolean;
  setIsLoading: (l: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;

  // Phase-by-phase actions
  executePhase: () => Promise<void>;
  planNextPhase: () => void;
  resetTactical: () => void;

  // Reset
  reset: () => void;

}

export const useStrategyStore = create<StrategyStore>((set, get) => ({
  pageState: 'setup',
  setPageState: (s) => set({ pageState: s }),

  round: null,
  setRound: (r) => set({ round: r }),

  activePhase: 'setup',
  setActivePhase: (p) => set({ activePhase: p, currentPhase: p }),
  selectedPlayerId: null,
  setSelectedPlayerId: (id) => set({ selectedPlayerId: id }),

  currentPhase: 'setup',
  setCurrentPhase: (p) => set({ activePhase: p, currentPhase: p }),

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

  // Adopt ghost path for current active phase only
  adoptGhostPath: (playerId: string) => set((state) => {
    const round = state.round;
    if (!round) return state;
    const ghost = round.ghost_paths.find((g) => g.player_id === playerId);
    if (!ghost) return state;

    const phase = state.activePhase;
    const seg = ghost.segments[phase] ?? [];
    const sampled = seg.filter((_, i) => i % 3 === 0 || i === seg.length - 1);
    const phaseWps = { ...(state.waypoints[phase] ?? {}) };
    phaseWps[playerId] = sampled.map((pt) => ({
      tick: Math.round(pt.time_s / 0.128),
      x: pt.x,
      y: pt.y,
      facing: 0,
    }));

    return {
      waypoints: {
        ...state.waypoints,
        [phase]: phaseWps,
      },
    };
  }),

  adoptAllGhostPaths: () => set((state) => {
    const round = state.round;
    if (!round) return state;

    const phase = state.activePhase;
    const phaseWps = { ...(state.waypoints[phase] ?? {}) };
    for (const t of round.teammates) {
      const ghost = round.ghost_paths.find((g) => g.player_id === t.player_id);
      if (!ghost) continue;
      const seg = ghost.segments[phase] ?? [];
      const sampled = seg.filter((_, i) => i % 3 === 0 || i === seg.length - 1);
      phaseWps[t.player_id] = sampled.map((pt) => ({
        tick: Math.round(pt.time_s / 0.128),
        x: pt.x,
        y: pt.y,
        facing: 0,
      }));
    }

    return {
      waypoints: {
        ...state.waypoints,
        [phase]: phaseWps,
      },
    };
  }),

  // Phase-by-phase state
  executedPhases: [],
  phaseResults: {},
  currentCheckpoint: null,

  // Legacy
  result: null,
  setResult: (r) => set({ result: r }),
  isReplay: false,
  setIsReplay: (v) => set({ isReplay: v }),

  isLoading: false,
  setIsLoading: (l) => set({ isLoading: l }),
  error: null,
  setError: (e) => set({ error: e }),

  // Execute the current active phase via POST /strategy/execute-phase
  executePhase: async () => {
    const { round, activePhase, waypoints, currentCheckpoint } = get();
    if (!round) return;

    set({ isLoading: true, error: null });

    try {
      const phaseWaypoints = waypoints[activePhase] ?? {};
      const response = await strategyApi.executePhase({
        round_id: round.round_id,
        side: round.user_side,
        phase: activePhase,
        waypoints: phaseWaypoints,
        checkpoint: currentCheckpoint ?? undefined,
      });

      const result = response.phase_result;

      set((state) => ({
        isLoading: false,
        executedPhases: [...state.executedPhases, activePhase],
        phaseResults: { ...state.phaseResults, [activePhase]: result },
        currentCheckpoint: result.checkpoint,
        pageState: 'phase-results',
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Phase execution failed';
      set({ isLoading: false, error: message });
    }
  },

  // Advance to the next phase for planning
  planNextPhase: () => {
    const { activePhase } = get();
    const idx = PHASES.indexOf(activePhase);
    if (idx < PHASES.length - 1) {
      const next = PHASES[idx + 1];
      set({
        activePhase: next,
        currentPhase: next,
        pageState: 'planning',
        selectedPlayerId: null,
      });
    } else {
      // All phases done
      set({ pageState: 'final-results' });
    }
  },

  resetTactical: () => {
    set({
      activePhase: 'setup',
      currentPhase: 'setup',
      executedPhases: [],
      phaseResults: {},
      currentCheckpoint: null,
      waypoints: {},
      selectedPlayerId: null,
      pageState: 'planning',
      error: null,
    });
  },

  reset: () => set({
    pageState: 'setup',
    round: null,
    activePhase: 'setup',
    currentPhase: 'setup',
    selectedPlayerId: null,
    waypoints: {},
    facingMode: false,
    showGhosts: true,
    result: null,
    isReplay: false,
    isLoading: false,
    error: null,
    executedPhases: [],
    phaseResults: {},
    currentCheckpoint: null,
  }),
}));

import { create } from 'zustand';
import { simulationsApi, type SimulationState, type PlayerPosition, type SimulationEvent } from '@/lib/api';

interface Snapshot {
  id: string;
  time_ms: number;
  phase: string;
  label?: string;
  spike_planted: boolean;
  spike_site: string | null;
  player_count: { attack: number; defense: number };
  players?: Array<{
    player_id: string; team_id: string; side: string;
    x: number; y: number; is_alive: boolean; health: number;
    agent?: string; facing_angle?: number; has_spike?: boolean;
    weapon_name?: string; role?: string;
  }>;
  round_state?: Record<string, unknown> | null;
  player_knowledge?: Record<string, unknown> | null;
  decisions?: Record<string, unknown> | null;
}

interface SimulationStore {
  // State
  sessionId: string | null;
  currentTime: number;
  phase: string;
  status: 'idle' | 'created' | 'running' | 'paused' | 'completed';
  positions: PlayerPosition[];
  events: SimulationEvent[];
  spikePlanted: boolean;
  spikeSite: string | null;
  droppedSpikePosition: [number, number] | null;
  isLoading: boolean;
  error: string | null;

  // What-If snapshots
  snapshots: Snapshot[];

  // What-If state
  whatIfResult: Record<string, unknown> | null;
  isRunningWhatIf: boolean;

  // Narration state
  narrationMode: boolean;
  isReplayActive: boolean;

  // Configuration
  attackTeamId: string;
  defenseTeamId: string;
  mapName: string;
  roundType: string;

  // Live AI commentary (Mode A)
  aiCommentaryEnabled: boolean;
  liveNarrationText: string | null;
  liveNarrationPaused: boolean;
  previousNarrations: string[];

  // Playback
  playbackSpeed: number;
  isPlaying: boolean;

  // Actions
  setConfig: (config: {
    attackTeamId?: string;
    defenseTeamId?: string;
    mapName?: string;
    roundType?: string;
  }) => void;
  createSimulation: () => Promise<void>;
  startSimulation: () => Promise<void>;
  tickSimulation: (ticks?: number) => Promise<void>;
  pauseSimulation: () => Promise<void>;
  runToCompletion: () => Promise<void>;
  setPlaybackSpeed: (speed: number) => void;
  togglePlayback: () => void;
  reset: () => void;

  // Position actions
  setPositions: (positions: PlayerPosition[]) => void;

  // What-If actions
  setWhatIfResult: (result: Record<string, unknown> | null) => void;
  setIsRunningWhatIf: (v: boolean) => void;
  clearWhatIfResult: () => void;

  // Narration actions
  setReplayActive: (v: boolean) => void;

  // Live commentary actions
  setAiCommentaryEnabled: (v: boolean) => void;
  setLiveNarration: (text: string | null) => void;
  setLiveNarrationPaused: (v: boolean) => void;
  continueLiveNarration: () => void;
}

// Module-level name cache — persists across position updates so names are never lost
const playerNameCache: Record<string, string> = {};

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  // Initial state
  sessionId: null,
  currentTime: 0,
  phase: 'opening',
  status: 'idle',
  positions: [],
  events: [],
  spikePlanted: false,
  spikeSite: null,
  droppedSpikePosition: null,
  isLoading: false,
  error: null,
  snapshots: [],

  // Live AI commentary
  aiCommentaryEnabled: true,
  liveNarrationText: null,
  liveNarrationPaused: false,
  previousNarrations: [],

  // What-If state
  whatIfResult: null,
  isRunningWhatIf: false,

  // Narration state
  narrationMode: false,
  isReplayActive: false,

  // Default configuration
  attackTeamId: 'cloud9',
  defenseTeamId: 'g2',
  mapName: 'ascent',
  roundType: 'full',

  // Playback
  playbackSpeed: 1,
  isPlaying: false,

  // Actions
  setConfig: (config) => {
    set((state) => ({
      attackTeamId: config.attackTeamId ?? state.attackTeamId,
      defenseTeamId: config.defenseTeamId ?? state.defenseTeamId,
      mapName: config.mapName ?? state.mapName,
      roundType: config.roundType ?? state.roundType,
    }));
  },

  createSimulation: async () => {
    const { attackTeamId, defenseTeamId, mapName, roundType } = get();

    set({ isLoading: true, error: null });

    try {
      const response = await simulationsApi.create({
        attack_team_id: attackTeamId,
        defense_team_id: defenseTeamId,
        map_name: mapName,
        round_type: roundType,
      });

      set({
        sessionId: response.data.id,
        status: 'created',
        currentTime: 0,
        positions: [],
        events: [],
        spikePlanted: false,
        spikeSite: null,
        snapshots: [],
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create simulation',
        isLoading: false,
      });
    }
  },

  startSimulation: async () => {
    const { sessionId } = get();
    if (!sessionId) return;

    set({ isLoading: true, error: null });

    try {
      const response = await simulationsApi.start(sessionId);
      const state = response.data;

      set({
        currentTime: state.current_time_ms,
        phase: state.phase,
        status: 'running',
        positions: state.positions.map((p: PlayerPosition) => {
          if (p.name) playerNameCache[p.player_id] = p.name;
          return playerNameCache[p.player_id] && !p.name
            ? { ...p, name: playerNameCache[p.player_id] }
            : p;
        }),
        events: state.events,
        spikePlanted: state.spike_planted,
        spikeSite: state.spike_site,
        droppedSpikePosition: state.dropped_spike_position,
        isLoading: false,
        isPlaying: true,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to start simulation',
        isLoading: false,
      });
    }
  },

  tickSimulation: async (ticks = 1) => {
    const { sessionId, status } = get();
    if (!sessionId || status !== 'running') return;

    try {
      const response = await simulationsApi.tick(sessionId, ticks);
      const state = response.data;

      // Update status from backend response
      const roundOver = (state as unknown as Record<string, unknown>).round_over === true;
      const newStatus = state.status === 'completed' || roundOver ? 'completed' : 'running';
      const isCompleted = newStatus === 'completed';

      // Merge any snapshots returned by the tick response (backend auto-captures at kills/plants)
      const tickSnapshots = (state as unknown as Record<string, unknown>).snapshots as Snapshot[] | undefined;
      const updates: Partial<SimulationStore> = {
        currentTime: state.current_time_ms,
        phase: state.phase,
        status: newStatus,
        positions: state.positions.map((p: PlayerPosition) => {
          if (p.name) playerNameCache[p.player_id] = p.name;
          return playerNameCache[p.player_id] && !p.name
            ? { ...p, name: playerNameCache[p.player_id] }
            : p;
        }),
        events: state.events,
        spikePlanted: state.spike_planted,
        spikeSite: state.spike_site,
        droppedSpikePosition: state.dropped_spike_position,
        isPlaying: isCompleted ? false : get().isPlaying,
      };
      if (Array.isArray(tickSnapshots) && tickSnapshots.length > 0) {
        const existing = get().snapshots;
        const existingIds = new Set(existing.map(s => s.id));
        const newSnaps = tickSnapshots.filter(s => !existingIds.has(s.id));
        if (newSnaps.length > 0) {
          updates.snapshots = [...existing, ...newSnaps];
        }
      }
      set(updates);
    } catch (error) {
      // If tick fails with 400, simulation likely completed
      if ((error as { response?: { status?: number } })?.response?.status === 400) {
        set({ status: 'completed', isPlaying: false });
      }
      console.error('Tick error:', error);
    }
  },

  runToCompletion: async () => {
    const { sessionId, status } = get();
    if (!sessionId || status !== 'running') return;

    set({ isLoading: true });

    try {
      const response = await simulationsApi.runToCompletion(sessionId);
      const data = response.data;

      set({
        currentTime: data.current_time_ms,
        phase: data.phase,
        status: 'completed',
        positions: data.positions.map((p: PlayerPosition) => {
          if (p.name) playerNameCache[p.player_id] = p.name;
          return playerNameCache[p.player_id] && !p.name
            ? { ...p, name: playerNameCache[p.player_id] }
            : p;
        }),
        events: data.events,
        spikePlanted: data.spike_planted,
        spikeSite: data.spike_site,
        snapshots: data.snapshots,
        isPlaying: false,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to run to completion',
        isLoading: false,
      });
    }
  },

  pauseSimulation: async () => {
    const { sessionId } = get();
    if (!sessionId) return;

    try {
      await simulationsApi.pause(sessionId);
      set({ status: 'paused', isPlaying: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to pause simulation',
      });
    }
  },

  setPlaybackSpeed: (speed) => {
    set({ playbackSpeed: speed });
  },

  togglePlayback: () => {
    const { isPlaying, status } = get();
    if (status === 'completed') return;

    set({ isPlaying: !isPlaying });
  },

  reset: () => {
    set({
      sessionId: null,
      currentTime: 0,
      phase: 'opening',
      status: 'idle',
      positions: [],
      events: [],
      spikePlanted: false,
      spikeSite: null,
      droppedSpikePosition: null,
      isLoading: false,
      error: null,
      isPlaying: false,
      snapshots: [],
      whatIfResult: null,
      isRunningWhatIf: false,
      narrationMode: false,
      isReplayActive: false,
      liveNarrationText: null,
      liveNarrationPaused: false,
      previousNarrations: [],
    });
  },

  // Position actions
  setPositions: (positions) => {
    // Backfill names from cache & update cache with any new names
    const enriched = positions.map((p) => {
      if (p.name) playerNameCache[p.player_id] = p.name;
      return playerNameCache[p.player_id] && !p.name
        ? { ...p, name: playerNameCache[p.player_id] }
        : p;
    });
    set({ positions: enriched });
  },

  // What-If actions
  setWhatIfResult: (result) => set({ whatIfResult: result }),
  setIsRunningWhatIf: (v) => set({ isRunningWhatIf: v }),
  clearWhatIfResult: () => set({ whatIfResult: null }),

  // Narration actions
  setReplayActive: (v) => set({ isReplayActive: v }),

  // Live commentary actions
  setAiCommentaryEnabled: (v) => set({ aiCommentaryEnabled: v }),
  setLiveNarration: (text) => set({ liveNarrationText: text }),
  setLiveNarrationPaused: (v) => set({ liveNarrationPaused: v, isPlaying: !v }),
  continueLiveNarration: () => set((state) => ({
    liveNarrationPaused: false,
    liveNarrationText: null,
    isPlaying: true,
    previousNarrations: state.liveNarrationText
      ? [...state.previousNarrations.slice(-4), state.liveNarrationText]
      : state.previousNarrations,
  })),
}));

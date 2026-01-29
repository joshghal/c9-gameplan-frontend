import { create } from 'zustand';
import { simulationsApi, type SimulationState, type PlayerPosition, type SimulationEvent } from '@/lib/api';

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

  // Configuration
  attackTeamId: string;
  defenseTeamId: string;
  mapName: string;
  roundType: string;

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
  setPlaybackSpeed: (speed: number) => void;
  togglePlayback: () => void;
  reset: () => void;
}

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
        positions: state.positions,
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
      const newStatus = state.status === 'completed' ? 'completed' : 'running';
      const isCompleted = newStatus === 'completed';

      set({
        currentTime: state.current_time_ms,
        phase: state.phase,
        status: newStatus,
        positions: state.positions,
        events: state.events,
        spikePlanted: state.spike_planted,
        spikeSite: state.spike_site,
        droppedSpikePosition: state.dropped_spike_position,
        isPlaying: isCompleted ? false : get().isPlaying,
      });
    } catch (error) {
      // If tick fails with 400, simulation likely completed
      if ((error as { response?: { status?: number } })?.response?.status === 400) {
        set({ status: 'completed', isPlaying: false });
      }
      console.error('Tick error:', error);
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
    });
  },
}));

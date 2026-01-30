import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface MapConfig {
  id: number;
  map_name: string;
  display_name: string;
  x_multiplier: number;
  y_multiplier: number;
  x_scalar_add: number;
  y_scalar_add: number;
  bounds_min_x: number;
  bounds_min_y: number;
  bounds_max_x: number;
  bounds_max_y: number;
  minimap_url: string | null;
  splash_url: string | null;
  is_active: boolean;
}

export interface Team {
  id: string;
  name: string;
  short_name: string;
  region: string;
  logo_url: string | null;
}

export interface Player {
  id: string;
  team_id: string;
  name: string;
  real_name: string | null;
  country: string | null;
  role: string | null;
}

export interface PlayerPosition {
  player_id: string;
  team_id: string;
  name?: string;
  x: number;
  y: number;
  is_alive: boolean;
  health: number;
  agent: string;
  side: 'attack' | 'defense';
  facing_angle?: number;
  has_spike?: boolean;
  weapon_name?: string;
  role?: string;
}

export interface SimulationEvent {
  timestamp_ms: number;
  event_type: string;
  player_id: string | null;
  target_id: string | null;
  position_x: number | null;
  position_y: number | null;
  details: Record<string, unknown>;
}

export interface SimulationState {
  session_id: string;
  current_time_ms: number;
  phase: string;
  status: string;
  positions: PlayerPosition[];
  events: SimulationEvent[];
  spike_planted: boolean;
  spike_site: string | null;
  dropped_spike_position: [number, number] | null;  // [x, y] if spike is on ground
}

export interface SimulationConfig {
  attack_team_id: string;
  defense_team_id: string;
  map_name: string;
  round_type: string;
}

// API Functions
export const mapsApi = {
  getAll: () => api.get<MapConfig[]>('/maps/'),
  getByName: (mapName: string) => api.get<MapConfig>(`/maps/${mapName}`),
};

export const teamsApi = {
  getAll: () => api.get<Team[]>('/teams/'),
  getById: (teamId: string) => api.get<Team>(`/teams/${teamId}`),
  getPlayers: (teamId: string) => api.get<Player[]>(`/teams/${teamId}/players`),
};

export const patternsApi = {
  getAll: (params?: {
    team_id?: string;
    map_name?: string;
    side?: string;
    phase?: string;
    limit?: number;
  }) => api.get<unknown[]>('/patterns/', { params }),
  query: (query: {
    team_id?: string;
    map_name: string;
    side: string;
    phase: string;
    limit?: number;
  }) => api.post<unknown[]>('/patterns/query', query),
};

export const simulationsApi = {
  create: (config: SimulationConfig) =>
    api.post<{ id: string }>('/simulations/', config),

  get: (sessionId: string) =>
    api.get<SimulationState>(`/simulations/${sessionId}`),

  start: (sessionId: string) =>
    api.post<SimulationState>(`/simulations/${sessionId}/start`),

  tick: (sessionId: string, ticks: number = 1) =>
    api.post<SimulationState>(`/simulations/${sessionId}/tick?ticks=${ticks}`),

  pause: (sessionId: string) =>
    api.post<{ id: string }>(`/simulations/${sessionId}/pause`),

  runWhatIf: (sessionId: string, scenario: {
    snapshot_time_ms: number;
    modifications: Record<string, { x?: number; y?: number; is_alive?: boolean }>;
    round_type_override?: string;
    swap_sides?: boolean;
  }) => api.post<SimulationState>(`/simulations/${sessionId}/what-if`, scenario),

  runToCompletion: (sessionId: string) =>
    api.post<{
      session_id: string;
      status: string;
      current_time_ms: number;
      phase: string;
      positions: PlayerPosition[];
      events: SimulationEvent[];
      spike_planted: boolean;
      spike_site: string | null;
      snapshots: Array<{
        id: string;
        time_ms: number;
        phase: string;
        spike_planted: boolean;
        spike_site: string | null;
        player_count: { attack: number; defense: number };
        players?: Array<{
          player_id: string; team_id: string; side: string;
          x: number; y: number; is_alive: boolean; health: number;
          agent?: string; facing_angle?: number; has_spike?: boolean;
          weapon_name?: string; role?: string;
        }>;
      }>;
    }>(`/simulations/${sessionId}/run-to-completion`),

  compare: (sessionId: string, scenario: {
    snapshot_time_ms: number;
    modifications: Record<string, Record<string, unknown>>;
  }) => api.post(`/simulations/${sessionId}/compare`, scenario),

  monteCarlo: (sessionId: string, iterations: number = 20) =>
    api.post(`/simulations/${sessionId}/monte-carlo?iterations=${iterations}`),

  getSnapshots: (sessionId: string) =>
    api.get(`/simulations/${sessionId}/snapshots`),
};

// Coaching Types
export interface ChatRequest {
  message: string;
  session_id?: string;
  map_context?: string;
  team_context?: string;
  use_tools?: boolean;
}

export interface ChatResponse {
  session_id: string;
  response: string;
}

export interface ScoutingReport {
  team_name: string;
  map_name?: string;
  generated_at: string;
  expires_at: string;
  report: {
    raw: string;
    executive_summary: string;
    attack_tendencies: string;
    defense_tendencies: string;
    key_players: string;
    economic_patterns: string;
    recommended_counters: string;
  };
}

export interface C9Prediction {
  primary_action: string;
  confidence: number;
  alternatives: Array<{ action: string; confidence: number }>;
  key_player: string;
  reasoning: string;
  timing_expectation: string;
  map_name?: string;
  side?: string;
}

export interface MistakeAnalysis {
  description: string;
  category: string;
  gravity_score: number;
  gravity_level: string;
  correct_play: string;
  impact_explanation: string;
  is_pattern: boolean;
  player_id?: string;
  timestamp_ms?: number;
}

// Coaching API
export const coachingApi = {
  chat: (request: ChatRequest) =>
    api.post<ChatResponse>('/coaching/chat', request),

  narrateSnapshot: (data: {
    session_id: string;
    snapshot: Record<string, unknown>;
    previous_narrations?: string[];
    narration_type?: string;
    map_name?: string;
    attack_team?: string;
    defense_team?: string;
  }) => api.post('/coaching/narrate-snapshot', data),

  // Note: streaming is handled separately with fetch API for SSE

  generateScoutingReport: (teamName: string, mapName?: string, forceRefresh: boolean = false) =>
    api.post<ScoutingReport>('/coaching/scouting-report', {
      team_name: teamName,
      map_name: mapName,
      force_refresh: forceRefresh,
    }),

  getScoutingReport: (teamName: string, mapName?: string) =>
    api.get<ScoutingReport>(`/coaching/scouting-report/${teamName}`, {
      params: { map_name: mapName },
    }),

  predictC9Action: (params: {
    mapName: string;
    side: string;
    phase?: string;
    roundType?: string;
    gameState?: Record<string, unknown>;
    opponentTeam?: string;
  }) =>
    api.post<C9Prediction>('/coaching/c9-predict', {
      map_name: params.mapName,
      side: params.side,
      phase: params.phase || 'opening',
      round_type: params.roundType || 'full',
      game_state: params.gameState,
      opponent_team: params.opponentTeam,
    }),

  analyzeMistake: (situation: string) =>
    api.post<MistakeAnalysis>('/coaching/analyze-mistake', { situation }),

  analyzePosition: (params: {
    mapName: string;
    positions: Array<Record<string, unknown>>;
    side: string;
    phase: string;
  }) =>
    api.post<{ analysis: string }>('/coaching/analyze-position', {
      map_name: params.mapName,
      positions: params.positions,
      side: params.side,
      phase: params.phase,
    }),

  clearSession: (sessionId: string) =>
    api.delete(`/coaching/session/${sessionId}`),

  getQuickSummary: (teamName: string, mapName: string) =>
    api.post<{ summary: string }>('/coaching/scouting-report/quick-summary', null, {
      params: { team_name: teamName, map_name: mapName },
    }),
};

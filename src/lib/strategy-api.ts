import { api } from './api';

export interface TeamMember {
  player_id: string;
  name: string;
  role: string;
  agent: string;
  weapon: string;
  spawn: [number, number];
}

export interface GhostPoint {
  time_s: number;
  x: number;
  y: number;
}

export interface GhostPath {
  player_id: string;
  name: string;
  agent: string;
  segments: Record<string, GhostPoint[]>;
}

export interface StrategyRound {
  round_id: string;
  map_name: string;
  user_side: 'attack' | 'defense';
  teammates: TeamMember[];
  phase_times: Record<string, [number, number]>;
  round_duration_s: number;
  ghost_paths: GhostPath[];
}

export interface Waypoint {
  tick: number;
  x: number;
  y: number;
  facing: number;
}

export interface PlayerPlan {
  player_id: string;
  waypoints: Waypoint[];
}

export interface StrategyExecuteRequest {
  round_id: string;
  side: string;
  plans: Record<string, PlayerPlan[]>;
}

export interface StrategyEvent {
  time_ms: number;
  event_type: string;
  player_id?: string;
  target_id?: string;
  details?: Record<string, unknown>;
}

export interface StrategySnapshot {
  time_ms: number;
  phase: string;
  players: Array<{
    player_id: string;
    x: number;
    y: number;
    side: string;
    is_alive: boolean;
    agent?: string;
    facing_angle?: number;
    has_spike?: boolean;
    weapon_name?: string;
    role?: string;
    name?: string;
    team_id?: string;
    health?: number;
  }>;
}

export interface StrategyReveal {
  opponent_team: string;
  user_team: string;
  atk_team?: string;
  def_team?: string;
  round_desc: string;
  round_num?: number;
  map_name?: string;
  user_side?: string;
  opponent_players?: string[];
  round_duration_s?: number;
  sim_duration_s?: number;
  score_line?: string;
  tournament?: string;
  match_date?: string;
}

export interface StrategyResult {
  session_id: string;
  winner: 'attack' | 'defense';
  events: StrategyEvent[];
  snapshots: StrategySnapshot[];
  reveal: StrategyReveal;
}

export const strategyApi = {
  async getRound(mapName: string, side: string): Promise<StrategyRound> {
    const { data } = await api.get('/strategy/rounds', { params: { map_name: mapName, side } });
    return data;
  },

  async getMaps(): Promise<string[]> {
    const { data } = await api.get('/strategy/maps');
    return data.maps;
  },

  async execute(request: StrategyExecuteRequest): Promise<StrategyResult> {
    const { data } = await api.post('/strategy/execute', request);
    return data;
  },

  async replay(request: { round_id: string }): Promise<StrategyResult> {
    const { data } = await api.post('/strategy/replay', request);
    return data;
  },
};

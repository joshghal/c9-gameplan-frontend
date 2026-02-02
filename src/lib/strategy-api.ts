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
  spike_planted?: boolean;
  spike_site?: string | null;
  dropped_spike_x?: number | null;
  dropped_spike_y?: number | null;
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

// --- Phase-by-phase tactical execution ---

export interface PlayerCheckpoint {
  player_id: string;
  x: number;
  y: number;
  side: string;
  is_alive: boolean;
  health: number;
  shield: number;
  has_spike: boolean;
  agent: string;
  name: string;
  kills: number;
  deaths: number;
  facing_angle: number;
  is_running: boolean;
}

export interface PhaseCheckpoint {
  phase_name: string;
  time_ms: number;
  players: PlayerCheckpoint[];
  spike_planted: boolean;
  spike_site: string | null;
  spike_plant_time_ms: number;
  site_execute_active: boolean;
  target_site: string | null;
}

export interface PhaseResult {
  phase_name: string;
  winner: string | null;
  round_ended: boolean;
  events: StrategyEvent[];
  snapshots: StrategySnapshot[];
  checkpoint: PhaseCheckpoint;
  end_positions: Array<{
    player_id: string;
    name: string;
    x: number;
    y: number;
    side: string;
    is_alive: boolean;
    health: number;
    agent: string;
    has_spike: boolean;
  }>;
}

export interface PhaseExecuteRequest {
  round_id: string;
  side: string;
  phase: string;
  waypoints: Record<string, Waypoint[]>;
  checkpoint?: PhaseCheckpoint;
}

export interface PhaseExecuteResponse {
  phase_result: PhaseResult;
}

export interface NarrationMoment {
  moment_index: number;
  focus_x: number;
  focus_y: number;
  zoom: number;
  narration: string;
  highlight_players?: string[];
  what_if_questions?: string[];
}

export interface RoundListItem {
  round_id: string;
  round_num: number;
  teams: string[];
  date: string;
  tournament: string;
  winner: string;
  side: string;
  duration_s: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function streamNarration(
  snapshots: StrategySnapshot[],
  finalState: Record<string, unknown>,
  options: {
    mapName: string;
    attackTeam: string;
    defenseTeam: string;
    playerRoster?: Array<{ id: string; name: string; agent: string; side: string; team: string }>;
  },
  onMoment: (moment: NarrationMoment) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<void> {
  try {
    const resp = await fetch(`${API_BASE_URL}/coaching/narration/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'tactical-' + Date.now(),
        snapshots,
        final_state: finalState,
        map_name: options.mapName,
        attack_team: options.attackTeam,
        defense_team: options.defenseTeam,
        player_roster: options.playerRoster ?? [],
      }),
    });

    if (!resp.ok || !resp.body) {
      onError('Narration request failed');
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.type === 'moment' && parsed.data) {
            onMoment(parsed.data as NarrationMoment);
          } else if (parsed.type === 'done') {
            onDone();
            return;
          } else if (parsed.type === 'error') {
            onError(parsed.data);
            return;
          }
        } catch {
          // skip malformed
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Narration failed');
  }
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

  async executePhase(request: PhaseExecuteRequest): Promise<PhaseExecuteResponse> {
    const { data } = await api.post('/strategy/execute-phase', request);
    return data;
  },

  async replay(request: { round_id: string }): Promise<StrategyResult> {
    const { data } = await api.post('/strategy/replay', request);
    return data;
  },

  async listRounds(mapName: string): Promise<{ rounds: RoundListItem[]; map_name: string }> {
    const { data } = await api.get('/strategy/rounds/list', { params: { map_name: mapName } });
    return data;
  },
};

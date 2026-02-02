// Documentation content for C9 Gameplan
// Structured as sections → subsections with markdown content

export interface DocSubsection {
  id: string;
  title: string;
  content: string;
}

export interface DocSection {
  id: string;
  title: string;
  subsections: DocSubsection[];
}

export const DOC_SECTIONS: DocSection[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1. OVERVIEW
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'overview',
    title: 'Overview',
    subsections: [
      {
        id: 'overview-intro',
        title: 'What is C9 Gameplan?',
        content: `
**C9 Gameplan** is a professional-grade VALORANT tactical simulation and analysis platform built for Cloud9's coaching staff. It merges **micro-level player analytics** with **macro-level strategic review**, enabling coaches to simulate full rounds, plan tactics against real VCT data, and receive AI-powered coaching insights.

> Category: **Comprehensive Assistant Coach** — merging player analytics with strategic review using GRID data for real-time coaching insights.

### The Problem

VALORANT coaches face a fundamental challenge: they can review past matches, but they can't **experiment** with tactical alternatives. Traditional VOD review shows *what happened* — not *what could have happened*.

- "What if we rotated B instead of committing A?"
- "What if the lurk pushed mid 5 seconds earlier?"
- "How would this execute play out against a different defensive setup?"

These questions require a **simulation engine** that understands professional-level VALORANT mechanics — movement, combat, information gathering, ability usage, economy, and spike mechanics — all calibrated against real VCT data.

### The Solution

C9 Gameplan provides three integrated tools:

1. **Live Simulation Engine** — 5v5 round simulation, 50x Monte Carlo, 128ms tick rate, role-based AI, combat model, A* pathfinding, economy, 43 abilities, sound propagation, spike mechanics, Pixi.js WebGL canvas with FOV cones
2. **Tactical Planner** — 4-phase planning (Setup/Mid-Round/Execute/Post-Plant), waypoint placement on VCT ghost paths, checkpoint serialization, AI narration per phase, What-If chat, "Watch Real Match" integration
3. **VCT Match Archive** — 11 maps, round browsing by match/tournament, full replay with interpolated positions, AI narration with moment-by-moment analysis, What-If chat, transport controls

All three tools are connected by a unified **AI coaching system** that provides streaming narration, What-If analysis, and scouting reports.
`,
      },
      {
        id: 'overview-stats',
        title: 'Key Statistics',
        content: `
### Platform Statistics

| Metric | Value |
|--------|-------|
| **Simulation Accuracy** | 86% against pro behavior benchmarks |
| **VCT Position Samples** | 592,893 from 33 professional matches |
| **Kills Analyzed** | 12,029 for combat calibration |
| **Players Profiled** | 85 professional players |
| **Maps Supported** | 11 (all current VALORANT maps) |
| **Unique Abilities** | 43 tracked from 2,294 GRID events |
| **Backend Code** | 22,803 lines across 18 service files |
| **Tick Rate** | 128ms (7.8 ticks/sec, matches Riot servers) |

### Validation Results (500 simulations)

| Metric | Simulated | VCT Target | Status |
|--------|-----------|------------|--------|
| Kill rate per round | 6.93 | 6.93 | Exact match |
| Trade kill rate | 25.2% | 25.2% | Exact match |
| Attack win rate | 49.2% | 47-49% | Within range |
| Defense win rate | 50.8% | 51-53% | Within range |
| Spike plant rate | ~35% | ~35% | Matches VCT |
`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. FEATURES
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'features',
    title: 'Features',
    subsections: [
      {
        id: 'features-simulation',
        title: 'Live Simulation Engine',
        content: `
### Full VALORANT Round Simulation

The simulation engine runs complete VALORANT rounds with 10 AI-controlled players (5v5), each with individual combat profiles, role-based behavior, and VCT-calibrated mechanics.

**Core capabilities:**
- **128ms tick rate** matching Riot's actual server tick rate (7.8 ticks/second)
- **10 AI players** with unique combat profiles (reaction time, headshot rate, spray control)
- **Role-based behavior:** Entry, Support, Lurk, Anchor, Controller — each with distinct movement patterns and decision-making
- **Phase progression:** Opening → Mid-Round → Post-Plant, with phase-specific engagement rates
- **Complete mechanics:** Combat, movement, abilities, economy, spike plant/defuse, sound propagation

**Visualization:**
- Real-time **Pixi.js WebGL canvas** rendering all 10 player positions
- FOV cones showing player vision angles
- Ability effects (smokes, flashes, molotovs) rendered on the map
- Kill indicators and damage numbers
- Spike carrier and plant site indicators

**Playback Controls:**
- Play/Pause with variable speed (0.5x, 1x, 2x, 4x)
- Timeline scrubbing with phase markers
- Skip forward (5s, 10s, 30s)
- Keyboard shortcuts: \`Space\` (play/pause), \`R\` (reset), \`F\` (fast-forward to end), \`1-4\` (speed presets)

**Configuration:**
- Map selection (all 11 VALORANT maps)
- Team selection with real pro player profiles
- Economy presets (full buy, half buy, eco, force)
`,
      },
      {
        id: 'features-tactical',
        title: 'Tactical Planner',
        content: `
### Phase-by-Phase Tactical Planning

The Tactical Planner lets coaches plan tactics one phase at a time against real VCT data, seeing the results of each phase before planning the next. This mirrors real coaching: you can't predict what happens after first contact.

**User Flow:**
\`\`\`
Setup (map + side)
  → Plan Phase 1 (Setup) → Execute → AI Narration + Chat
  → Plan Phase 2 (Mid-Round) → Execute → AI Narration + Chat
  → Plan Phase 3 (Execute) → Execute → AI Narration + Chat
  → Plan Phase 4 (Post-Plant) → Execute → AI Narration + Chat
  → Final Summary + "Watch Real Match"
\`\`\`

**Planning Interface:**
- **Ghost paths:** Real VCT pro player trajectories shown as semi-transparent paths on the map
- **Waypoint placement:** Click to place movement waypoints for each player
- **Phase boundaries:** Setup (0-15s), Mid-Round (15-50s), Execute (50-75s), Post-Plant (75-100s)
- **Player list:** Shows each player's role, agent, weapon, and health

**Execution:**
- User team follows placed waypoints with interpolated movement
- Opponent team uses **full SimulationEngine AI** — threat-aware movement, information system, group patrol, ability tracking, trade mechanics
- Combat runs every tick for all players (guided or AI)
- **Checkpoint system** preserves full engine state between phases (positions, health, utility, spike status, events)

**Phase Results:**
- AI narration auto-plays analyzing tactical decisions
- What-If chat for exploring alternatives
- Event timeline showing kills, plants, defuses
- "Plan Next Phase" or "View Final Summary" buttons
- "Watch Real Match" navigates to VCT Match Archive

**Key technical detail:** The tactical engine wraps the full \`SimulationEngine\` — it's not a simplified version. Opponent AI uses all 22,803 lines of simulation logic including the information system, behavior adaptation, strategy coordination, and combat model. User players are marked \`is_guided\` and skip AI movement (their positions come from waypoint interpolation), but they still participate in full combat resolution.
`,
      },
      {
        id: 'features-matches',
        title: 'VCT Match Archive',
        content: `
### Professional Match Replay & Analysis

The VCT Match Archive provides a standalone route for browsing and replaying real professional VALORANT matches with AI narration.

**Map Browser:**
- Grid of all 11 VALORANT maps with availability indicators
- Maps with data show as interactive cards with hover effects
- Maps without data are dimmed with "No data available" label
- GSAP entrance animation (staggered card reveals with scan-line header)

**Round List:**
- Rounds grouped by match (same date + teams)
- Each match shows: team names, tournament, date, C9 score vs opponent score
- Individual rounds show: round number, C9's side (ATK/DEF), winner, duration
- Sorted by date (newest first)

**Match Replay:**
- Full replay with interpolated player positions from VCT trajectory data
- **AI narration** auto-starts on load: the coaching AI analyzes round events and generates moment-by-moment commentary
- **Transport controls:** Play, Pause, Stop, Skip Forward/Back through narration moments
- **What-If chat:** Ask questions about any moment ("Why did they rotate?", "Was this the right peek?")
- **Moment list:** All narration moments listed in sidebar, click to jump to any moment
- **Player markers** with team colors, health bars, and name labels
- **Event indicators** for kills, spike plant/defuse

**Integration with Tactical Planner:**
From the Tactical Planner's Final Results view, "Watch Real Match" navigates directly to the Match Archive with the same round loaded, allowing coaches to compare their tactical plan against what actually happened in the pro match.
`,
      },
      {
        id: 'features-ai',
        title: 'AI Coaching System',
        content: `
### AI-Powered Coaching Intelligence

The AI coaching system provides intelligent analysis across all three tools. It's not a simple chatbot — it receives full simulation context and uses structured tools to analyze specific tactical situations.

**AI Narration (SSE Streaming):**
- Generates 5-8 tactical moments per round/phase
- Each moment includes: focus position (x, y), zoom level, narration text, highlight players, What-If questions
- Streamed via Server-Sent Events for real-time delivery
- Camera automatically pans/zooms to narrated positions using GSAP animation
- Narration adapts to what actually happened: kills, rotations, plants, clutch plays

**What-If Chat:**
- Full conversational AI with complete match/simulation context
- Context includes: all player positions, events, economy, round state, current narration moment
- **Tool use:** AI can invoke structured tools during conversation:
  - Kill analysis (query specific engagements)
  - Position queries (where was player X at time T?)
  - Economy checks (what was the buy state?)
  - Strategy analysis (what strategy was being run?)
- Responses stream in real-time with tool call indicators

**Scouting Reports:**
- Auto-generated opponent analysis from match data
- Covers: tendencies, positioning patterns, economic habits, counter-strategies
- Formatted as structured tactical briefings

**Technical Implementation:**
- Backend: \`POST /coaching/narration/stream\` (SSE), \`POST /coaching/chat/stream\` (SSE)
- LLM: AI model with streaming via SSE
- Context building: \`context_builder.py\` assembles simulation state into LLM-friendly format
- Prompts: Coaching persona with tactical analysis expertise
- Tool definitions: Structured tool schemas for kill analysis, position queries, etc.
`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. SIMULATION ENGINE DEEP DIVE
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'engine',
    title: 'Simulation Engine',
    subsections: [
      {
        id: 'engine-combat',
        title: 'Combat Model',
        content: `
### Realistic Combat Resolution

The combat model simulates gunfights with weapon-specific mechanics, accounting for reaction time, crosshair placement, movement accuracy, and peeker's advantage.

**Combat Resolution Pipeline (7 steps):**

1. **Range Check** — Euclidean distance between players (normalized 0-1 coordinates)
2. **Line of Sight** — Bresenham ray tracing + smoke circle collision detection
3. **Engagement Probability** — Phase-based rates: Opening 0.0008, Mid 0.0025, Post-Plant 0.0035 per tick
4. **Win Probability** — Composite of weapon stats, movement, peeker's advantage, position
5. **Winner Determination** — Normalized probability roll
6. **Damage Application** — Headshot chance, armor reduction, distance falloff
7. **Death Handling** — Ultimate point award, trade window activation (3 seconds)

**Player Combat Profile:**
\`\`\`
base_reaction_ms:    200    (pro range: 150-180ms)
crosshair_placement: 0.70   (VCT-calibrated from hold_angles.json)
headshot_rate:       0.25   (VCT average; top pros 31-34%)
spray_control:       0.6
counter_strafe_skill: 0.75  (104ms to deadzone, community-verified)
\`\`\`

**Weapon Database (23 weapons):**

| Weapon | Fire Rate | HS Dmg | Body Dmg | Spray Decay |
|--------|-----------|--------|----------|-------------|
| Vandal | 600 RPM | 160 | 40 | 0.15/shot |
| Phantom | 660 RPM | 140 | 39 | 0.12/shot |
| Operator | 36 RPM | 255 | 150 | N/A |
| Sheriff | 200 RPM | 159 | 55 | 0.08/shot |
| Spectre | 783 RPM | 78 | 26 | 0.10/shot |

**Peeker's Advantage:**
- +12% accuracy bonus for moving player (derived from Riot netcode blog: 40-70ms network advantage)
- -4% net for stationary holder
- Based on real VALORANT engine mechanics where the peeker sees the holder before the holder sees the peeker

**Movement Accuracy Modifiers:**
| State | Rifle | SMG | Shotgun |
|-------|-------|-----|---------|
| Standing | 100% | 100% | 100% |
| Walking | 30% | 50% | 80% |
| Running | 15% | 30% | 60% |

**Trade System:**
- 3-second trade window after a kill
- 79.3% of VCT trades occur within this window (validated)
- Trade probability: 4-8% per tick within window
- Reduced if trading player is also under fire
`,
      },
      {
        id: 'engine-movement',
        title: 'Movement & Pathfinding',
        content: `
### A* Pathfinding with VCT Pattern Weighting

Movement uses A* navigation with costs weighted by how frequently professional players use each route. This means the simulation naturally produces realistic movement patterns without hardcoding specific paths.

**A* with Pattern-Weighted Costs:**
- Grid-based navigation on walkable map cells
- **Cost weighting:** Cells frequently traversed by pros = lower cost, so A* naturally prefers realistic routes
- **Role-based preferences:** Lurk paths prefer unusual/flanking routes (higher weight on common paths), Entry paths prefer standard approaches
- **Snap-to-walkable:** When start/goal positions fall on unwalkable cells, the system searches for the nearest walkable cell within a configurable radius

**Movement States:**
| State | Speed | Accuracy | Sound Range |
|-------|-------|----------|-------------|
| Running | 5.73 m/s | 15% (rifles) | 40m |
| Walking | 2.87 m/s | 30% (rifles) | 0m (silent) |
| Standing | 0 m/s | 100% | 0m |

**Sound Propagation System:**
- Running footsteps: 40m detection range
- Gunfire: 60m detection range
- Ability usage: 50m detection range
- Spike interaction: 80m detection range (beep)
- Sound detected → updates information system → influences AI decisions

**Threat-Aware Movement:**
- Players avoid known enemy positions when pathing
- Weight increases near last-known enemy locations
- Retreating players path away from threats
- Post-plant positions prefer cover angles facing common retake routes

**Ghost Path System (VCT Trajectories):**
- Professional player trajectories extracted from GRID telemetry data
- Displayed as semi-transparent paths in the Tactical Planner
- Used as anchor points for opponent AI in tactical simulations
- Coordinate-normalized to 0-1 range per map using affine transforms
`,
      },
      {
        id: 'engine-decisions',
        title: 'AI Decision System',
        content: `
### Information-Driven Decision Making

The AI decision system produces emergent behavior from information state rather than scripted actions. Players make decisions based on what they know (or think they know) about the round state.

**Decision Types:**
- **PEEK** — Aggressive angle peek when information suggests advantage
- **ROTATE** — Move to a different site/area based on intel
- **PLANT** — Carrier moves to plant spike when site appears clear
- **DEFUSE** — Defender starts defuse when attackers are cleared
- **RETREAT** — Fall back when outnumbered or outgunned
- **HOLD** — Maintain position and wait for information

**Information System:**
- Each player maintains their own **information state** — what enemies they've seen, heard, or inferred
- Information decays over time (old sightings become less reliable)
- Sound events create approximate enemy positions (not exact)
- Teammates share information within communication range

**Behavior Adaptation Modifiers:**
| Situation | Modifier | Source |
|-----------|----------|--------|
| Man advantage | +15% aggression per extra player | VCT analysis |
| Man disadvantage | -15% aggression per missing player | VCT analysis |
| First blood (got it) | +12% aggression | VCT first blood data |
| First blood (lost it) | -15% aggression | VCT first blood data |
| Time pressure (>70s) | +25% aggression | Round time analysis |
| Post-plant (attack) | -20% aggression (play passive) | VCT post-plant |
| Post-plant (defense) | +25% aggression (retake) | VCT post-plant |
| Trade window active | +30% aggression | Trade pattern data |

**Strategy Coordinator:**
- Named strategies: \`A_Split\`, \`B_Rush\`, \`Default\`, \`Retake\`, \`Anti_Eco\`
- Role assignments per strategy (who entries, who lurks, who supports)
- Mid-round rotation triggers:
  - Kill detected → rotate toward engagement
  - Stack detected → split to opposite site
  - Time pressure → commit to nearest site
  - Entry death → fall back and regroup
`,
      },
      {
        id: 'engine-economy',
        title: 'Economy Engine',
        content: `
### VCT-Calibrated Economy System

The economy engine manages buy decisions using VALORANT's economy rules, calibrated against real VCT purchasing patterns.

**Buy Decision Logic:**

| Money Range | Buy Type | Description |
|-------------|----------|-------------|
| ≥4,500 | Full Buy | Best weapons + full armor + utility |
| 3,500–4,500 | Half Buy | Rifles + light armor or SMGs + heavy armor |
| 2,500–3,500 | Force Buy | Best available within budget |
| <2,500 | Eco | Pistols only, save for next round |

**VCT-Calibrated Loadout Distribution:**

| Weapon | Usage Rate | Context |
|--------|-----------|---------|
| Vandal | 40.3% | Primary rifle (attack-favored) |
| Phantom | 14.0% | Primary rifle (defense-favored) |
| Classic | 8.0% | Pistol round / eco |
| Sheriff | 7.4% | Eco round / force |
| Spectre | 5.2% | Half buy / anti-eco |
| Operator | 3.7% | Full buy (specialist) |
| Ghost | 3.5% | Pistol round preferred |

**Economy Rules:**
- Round win: $3,000 base
- Round loss: $1,900 + $500 per consecutive loss (max 5 losses = $4,400)
- Kill reward: $200 per kill
- Spike plant bonus: $300 for all attackers
- Team coordination: if >3 players can full buy, all full buy; otherwise collective eco/force
`,
      },
      {
        id: 'engine-abilities',
        title: 'Ability System',
        content: `
### 43 Abilities from 2,294 GRID Events

The ability system tracks all agent abilities with timing and positioning data extracted from professional matches via the GRID Esports API.

**Ability Categories & Top Abilities:**

| Category | Events | Examples |
|----------|--------|---------|
| Smokes | 636 | Sky Smoke, Dark Cover, Poison Cloud, Toxic Screen, Cloudburst |
| Flashes | 449 | Guiding Light, Stuns, Dizzy, Blindside |
| Recon | 402 | Turret, Boom Bot, Trailblazer, Alarm Bot |
| Zone Denial | 448 | Snake Bite, Paint Shells, Nanoswarm, Incendiary |
| Movement | 299 | Blast Pack, Gatecrash, Tailwind |
| Ultimates | 43 | Showstopper, Thrash, Orbital Strike |

**Smoke Mechanics:**
- Rendered as circles on the map with configurable radius
- Block line-of-sight: Bresenham ray checks for circle intersection
- Duration: varies by agent (Brim 19.25s, Omen 15s, Viper toggle)
- One-way smoke detection (position-dependent visibility)

**Flash Mechanics:**
- Reduce hit accuracy by 90% for affected duration
- Flash duration: 1.1-2.0s depending on ability
- Can be turned away from (facing angle check)
- Pop flash timing from GRID data

**Zone Denial:**
- Damage over time in affected area
- Forces repositioning (players path around molly/nanoswarm zones)
- Duration and damage calibrated from GRID events

**Ultimate System:**
- Per-agent ultimate costs (6-8 points typical)
- Points earned from: kills (+1), orbs (+1), round loss (+1)
- Usage triggers: retake situations, post-plant, entry for kills
- 393 ultimates used across 500 simulation rounds (validated)
`,
      },
      {
        id: 'engine-spike',
        title: 'Spike Mechanics',
        content: `
### Complete Spike Plant & Defuse System

The spike system implements full VALORANT spike mechanics including carrier tracking, plant timing, defuse with half-defuse, and post-plant dynamics.

**Spike Plant:**
- **Plant time:** 4.0 seconds (must remain stationary)
- **Plant zones:** Defined per-map site boundaries (A, B, C for Haven/Lotus)
- **Auto-plant trigger:** When guided carrier reaches site during Execute phase
- **Plant bonus:** $300 for all attackers when spike is planted

**Spike Defuse:**
- **Full defuse:** 7.0 seconds
- **Half-defuse checkpoint:** 3.5 seconds (allows tap-defuse fakes)
- **Defuse mechanics:** Defender must remain stationary within spike radius
- **Interrupted defuse:** Resets if defender takes damage or moves

**Carrier Tracking:**
- One attacker designated as spike carrier
- If carrier dies → spike drops at death position
- Dropped spike visible on map as yellow indicator
- Any alive attacker can pick up dropped spike
- Dropped spike position tracked in snapshots

**Post-Plant Behavior:**
- **Attackers:** Reduce aggression by 20%, hold angles on spike
- **Defenders:** Increase aggression by 25% (retake), rush toward spike site
- **Time pressure:** As detonation timer counts down, defender aggression increases further
- **Detonation:** 45 seconds after plant → attackers win automatically

**Spike Sound:**
- Spike beep audible at 80m range (largest sound in the game)
- Beep interval increases as timer counts down
- Defenders use spike sound for information gathering
`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. DATA PIPELINE
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'data',
    title: 'Data Pipeline',
    subsections: [
      {
        id: 'data-sources',
        title: 'VCT Data Sources',
        content: `
### Professional Match Data Extraction

C9 Gameplan uses two primary data sources for professional VALORANT match data, supplemented by community-verified parameters.

**GRID Esports API:**
- Professional match telemetry delivered as JSONL event streams
- Events include: player positions, kills, deaths, ability usage, spike interactions, round results
- 33 VCT matches processed (Americas, EMEA, Pacific leagues)
- Event types: \`player-position\`, \`player-died\`, \`ability-used\`, \`spike-planted\`, \`spike-defused\`, \`round-ended\`
- Each event has: timestamp (ms), player ID, team ID, position (x, y, z), map coordinates

**Henrik API:**
- Kill event snapshots with all 10 player positions at moment of kill
- Economy data: loadout value, weapon, armor, credits per round
- 35,620 player-round entries across multiple tournaments
- Provides positions at kill moments (since continuous position tracking has gaps)

**Data Processing Scripts (\`backend/scripts/\`):**
- \`extract_trajectories.py\` — Main extraction from GRID JSONL files
- \`extract_movement_patterns.py\` — Zone transition analysis
- \`generate_opponent_profiles.py\` — Player profile aggregation
- \`download_grid_matches.py\` — GRID API downloader with pagination

**5 Cleanup Filters Applied:**
1. **Post-round removal** — Strip positions after round officially ends
2. **Deduplication** — Remove duplicate position samples at same tick
3. **Outlier detection** — Remove positions outside valid map bounds
4. **Spawn resets** — Detect and separate pre-round spawn positions
5. **Death truncation** — Truncate trajectories at player death time
`,
      },
      {
        id: 'data-scale',
        title: 'Data Scale & Files',
        content: `
### Data Files Overview

| File | Size | Contents |
|------|------|----------|
| \`position_trajectories.json\` | 50 MB | 592,893 position samples from 33 matches |
| \`c9_movement_models.json\` | 5.6 MB | C9 player-specific patterns |
| \`simulation_profiles.json\` | — | 85 pro player profiles |
| \`vct_match_metadata.json\` | — | Tournament, date, teams per game |
| \`behavioral_patterns.json\` | — | Role-specific combat stats |
| \`movement_patterns.json\` | — | Zone transition frequencies |
| \`trade_patterns.json\` | — | Trade timing and distance data |
| \`hold_angles.json\` | — | Crosshair placement patterns |
| \`economy_patterns.json\` | — | Buy decision data |

**Trajectory Data Structure (per round):**
\`\`\`
{
  "round_num": 5,
  "game_id": "2629391",
  "round_duration_s": 87.4,
  "winner_team": "Cloud9",
  "kills": [
    { "killer": "OXY", "victim": "aspas", "weapon": "Vandal",
      "time_ms": 34200, "position": [0.45, 0.62] }
  ],
  "player_trajectories": {
    "OXY": [
      { "time_ms": 0, "x": 0.12, "y": 0.85, "team": "Cloud9",
        "side": "attacker", "agent": "Jett" },
      ...
    ]
  }
}
\`\`\`

**Player Profile Structure:**
\`\`\`
{
  "name": "OXY",
  "primary_role": "Duelist",
  "primary_weapon": "Vandal",
  "base_aggression": 0.72,
  "trade_awareness": 0.85,
  "headshot_rate": 0.31,
  "k_d_ratio": 1.24
}
\`\`\`

**Role Distribution (85 players):**

| Role | Count | Percentage |
|------|-------|-----------|
| Initiator | 26 | 31% |
| Sentinel | 22 | 26% |
| Duelist | 20 | 24% |
| Controller | 17 | 19% |
`,
      },
      {
        id: 'data-normalization',
        title: 'Coordinate Normalization',
        content: `
### Map Coordinate System

Raw VALORANT game coordinates use an arbitrary 3D coordinate system that differs per map. C9 Gameplan normalizes all coordinates to a consistent 0-1 range per map using per-map affine transforms.

**Normalization Formula:**
\`\`\`
normalized_x = scale * raw_y + offset_x
normalized_y = -scale * raw_x + offset_y
\`\`\`

Note the axis swap (raw Y → normalized X, negative raw X → normalized Y) — this accounts for the rotation between VALORANT's internal coordinate system and top-down map view.

**Per-Map Calibration:**
- Each map has unique scale and offset values
- Calibrated by matching known landmark positions (site centers, spawn locations) against map images
- Validated by rendering VCT trajectories over map images and checking alignment

**Snap-to-Walkable System:**
- Normalized coordinates may land on unwalkable cells (walls, elevated terrain)
- \`_snap_to_walkable()\` searches outward in a spiral pattern for the nearest walkable cell
- Search radius: up to 20 cells (~15% of map width)
- Ensures all player positions are valid for pathfinding

**Site Boundaries:**
Each map defines site boundaries as rectangular zones in normalized coordinates:
\`\`\`
MAP_DATA = {
  "haven": {
    "sites": {
      "A": { "x": 0.65, "y": 0.20, "radius": 0.08 },
      "B": { "x": 0.50, "y": 0.50, "radius": 0.08 },
      "C": { "x": 0.35, "y": 0.80, "radius": 0.08 }
    }
  }
}
\`\`\`
`,
      },
      {
        id: 'data-confidence',
        title: 'Parameter Confidence',
        content: `
### Validated Simulation Parameters

All simulation parameters are categorized by confidence level based on their data source.

**VCT-Extracted (~40 parameters):**
Parameters derived directly from analysis of 33 VCT matches and 12,029 kills:
- Engagement distances
- Kill timing distributions
- Trade rates and timing windows
- Position heat maps per map/site
- Weapon usage distributions
- Role-specific behavior patterns
- Opening movement timing
- Plant timing distributions

**Riot-Official (~10 parameters):**
Parameters from official Riot Games documentation:
- Weapon damage values (head/body/leg)
- Weapon fire rates
- Movement speeds (running/walking)
- Spike plant/defuse timing
- Armor damage reduction (25 light, 50 heavy)
- Ability durations

**Community-Verified (~15 parameters):**
Parameters validated by the community (VLR.gg, THESPIKE.GG, Riot netcode blog):
- Peeker's advantage: +12% (from Riot netcode blog: 40-70ms advantage)
- Counter-strafe timing: 104ms to deadzone
- Trade window: 3 seconds (79.3% of VCT trades within)
- Movement accuracy: rifles 15% running / 30% walking / 100% standing
- Reaction time ranges: 150-250ms based on player skill tier

**Estimated (~15 parameters):**
Parameters that need further validation:
- Exact spray control curves per weapon
- Ability-specific accuracy modifiers
- Agent-specific ultimate value thresholds
- Sound propagation through walls (currently simplified)
`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. TECHNICAL ARCHITECTURE
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'architecture',
    title: 'Technical Architecture',
    subsections: [
      {
        id: 'arch-stack',
        title: 'Tech Stack',
        content: `
### Technology Stack

**Backend:**
| Technology | Purpose |
|-----------|---------|
| **FastAPI** | REST API framework (Python 3.10+) |
| **PostgreSQL + TimescaleDB** | Persistent storage with time-series optimization |
| **Redis** | Session caching, real-time state |
| **LLM Integration** | AI coaching (narration, chat, scouting) |
| **NumPy / Pandas** | Data processing and analysis |

**Frontend:**
| Technology | Purpose |
|-----------|---------|
| **Next.js 16** | React framework with App Router |
| **React 19** | UI components |
| **TypeScript 5** | Type safety |
| **TailwindCSS 4** | Utility-first styling |
| **Zustand** | Lightweight state management |
| **Pixi.js** | WebGL map canvas rendering |
| **Framer Motion** | Animation library |
| **GSAP** | Camera pan/zoom animation |

**Data Sources:**
| Source | Purpose |
|--------|---------|
| **GRID Esports API** | VCT professional match telemetry |
| **Henrik API** | Kill snapshots, economy data |

**Development:**
| Tool | Purpose |
|------|---------|
| **JetBrains IDE** | Primary development environment |
| **Junie** | AI development assistant |
`,
      },
      {
        id: 'arch-system',
        title: 'System Architecture',
        content: `
### System Overview

\`\`\`
Frontend (Next.js :3000)
├── /                    Simulation (Pixi.js canvas)
├── /tactical            Tactical Planner (phase-by-phase)
├── /matches             VCT Match Archive (replay + narration)
├── /docs                Documentation
└── Zustand stores       simulation.ts, strategy.ts, camera.ts

    ↕ HTTP/SSE

Backend (FastAPI :8000)
├── /api/v1/simulations  Create, tick, run rounds, what-if
├── /api/v1/strategy     Rounds, execute phase, replay
├── /api/v1/coaching     Narration stream, chat stream, scouting
└── /api/v1/matches      Match/round data

Core Services (22,803 lines)
├── simulation_engine.py     Main tick loop (3,363 lines)
├── tactical_simulation_engine.py  Phase wrapper
├── vct_round_service.py     VCT data + ghost paths
├── combat_model.py          Kill probability
├── pathfinding.py           A* navigation
├── ai_decision_system.py    AI behavior
├── ability_system.py        43 abilities
├── economy_engine.py        Buy decisions
├── strategy_coordinator.py  Named strategies
├── behavior_adaptation.py   Situational modifiers
├── c9_realism.py           C9 player patterns
└── llm/                    AI integration
    ├── client.py           LLM client
    ├── context_builder.py  Simulation → LLM context
    ├── prompts.py          Coaching persona
    └── streaming.py        SSE implementation
\`\`\`

**Key Design Decisions:**
1. **Tick-based simulation** (128ms) matches Riot's server tick rate for realistic timing
2. **SSE streaming** for AI narration and chat (lower latency than WebSocket for one-way data)
3. **Checkpoint serialization** enables phase-by-phase tactical planning without re-running earlier phases
4. **Dual-repo structure** allows frontend and backend to be deployed independently
5. **Pattern-weighted A*** produces realistic paths without hardcoding routes
6. **Information system per player** creates emergent behavior (players act on what they know, not omniscient)
`,
      },
      {
        id: 'arch-validation',
        title: 'Validation & Accuracy',
        content: `
### Simulation Validation

The simulation has been validated against VCT professional match data across 500 simulations on all 11 maps.

**Accuracy Score: 86% (12/14 test scenarios match expected behavior)**

**Key Metrics:**

| Metric | Simulated | VCT Benchmark | Status |
|--------|-----------|---------------|--------|
| Kills per round | 6.93 | 6.93 | Exact match |
| Trade kill rate | 25.2% | 25.2% | Exact match |
| Attack win rate | 49.2% | 47-49% | Within range |
| Defense win rate | 50.8% | 51-53% | Within range |
| Spike plant rate | ~35% | ~35% | Matches |
| Avg trade time | 1.72s | 1.72s | Exact match |
| Engagement distance | 1846 units | 1846 units | Exact match |
| Ultimate usage | 393/500 rounds | — | Realistic |

**Validation Methodology:**
1. Run 500 simulations across all 11 maps (diverse team compositions)
2. Compare aggregate statistics against VCT averages from 33 professional matches
3. Verify individual mechanics: peeker's advantage, trade windows, plant timing
4. Cross-reference weapon kill distributions against VCT weapon meta
5. Check role-specific behaviors (duelists entry first, sentinels hold sites)

**Accuracy Breakdown by System:**
| System | Accuracy | Notes |
|--------|----------|-------|
| Combat | 90% | Kill rate and trade rate exact match |
| Movement | 85% | Pathing realistic, some wall-clip edge cases |
| Economy | 88% | Buy decisions match VCT patterns |
| Abilities | 80% | Usage timing good, placement approximate |
| Strategy | 82% | Rotation triggers realistic, some timing drift |
| Spike | 90% | Plant/defuse mechanics match exactly |
`,
      },
      {
        id: 'arch-jetbrains',
        title: 'JetBrains & Junie',
        content: `
### Development with JetBrains IDE & Junie

C9 Gameplan was built entirely within the JetBrains ecosystem, leveraging JetBrains IDE as the primary development environment and **Junie AI** as the AI-powered development assistant throughout the project lifecycle.

---

**JetBrains IDE — Core Development Environment:**

| Capability | How It Was Used |
|-----------|----------------|
| **WebStorm** | Frontend development — Next.js 16, React 19, TypeScript 5 with full IntelliSense and type checking |
| **PyCharm** | Backend development — FastAPI services, simulation engine (3,363-line core), data processing pipelines |
| **Dual-Repo Management** | Git tooling for independent frontend/backend repositories with branch-per-feature workflow |
| **Database Tools** | PostgreSQL + TimescaleDB schema design and query debugging |
| **Run Configurations** | One-click launch for \`uvicorn\` (backend), \`npm run dev\` (frontend), and Docker services |
| **Built-in Terminal** | Integrated terminal for running simulation validation scripts and data extraction pipelines |
| **Refactoring Tools** | Rename-safe refactoring across 22,803 lines of backend code and 40+ frontend components |

---

**Junie AI — Development Assistant:**

Junie was integrated into the development workflow from day one, assisting across every layer of the application:

**Backend — Simulation Engine Development:**
- Assisted in implementing the tick-based simulation loop (128ms tick rate, 7.8 ticks/sec)
- Helped design the combat model with weapon stats, distance falloff curves, and peeker's advantage calculations
- Generated boilerplate for 18 backend service files and their interconnections
- Assisted with A* pathfinding implementation with pattern-weighted costs
- Helped implement the economy engine with VCT-calibrated buy logic

**Backend — Data Pipeline:**
- Assisted in writing GRID JSONL parsing scripts for extracting 592,893 position samples
- Helped design the 5-stage data cleanup pipeline (post-round removal, dedup, outlier detection, spawn resets, death truncation)
- Generated coordinate normalization transforms for all 11 VALORANT maps
- Assisted with player profile generation from VCT match data (85 pro players)

**Frontend — UI Development:**
- Scaffolded React components following the C9 design system (dark theme, cyan accents, clip-path corners)
- Assisted with Pixi.js WebGL canvas integration for real-time map visualization
- Helped implement Zustand stores for simulation state, camera control, and strategy planning
- Generated GSAP animation sequences for camera pan/zoom during AI narration
- Assisted with SSE streaming integration for real-time AI coaching responses

**Frontend — Tactical Planner:**
- Helped implement the 4-phase planning flow (Setup → Mid-Round → Execute → Post-Plant)
- Assisted with checkpoint serialization for preserving engine state between phases
- Generated the waypoint placement system with ghost path visualization

**AI Coaching Integration:**
- Assisted in building the SSE streaming pipeline for AI narration and What-If chat
- Helped design the context builder that assembles simulation state into LLM-friendly prompts
- Generated structured tool schemas for kill analysis, position queries, and economy checks

---

**Development Workflow with JetBrains + Junie:**

\`\`\`
┌─────────────────────────────────────────────────────┐
│  Feature Planning (Double Diamond Process)          │
│  ├── Discover: Investigate codebase + data          │
│  └── Define: Narrow scope, define API contracts     │
├─────────────────────────────────────────────────────┤
│  Backend Development (PyCharm + Junie)              │
│  ├── Service logic with Junie code generation       │
│  ├── Schema + Route boilerplate via Junie           │
│  ├── Verification scripts (curl → assert shapes)    │
│  └── JetBrains debugger for tick-by-tick inspection │
├─────────────────────────────────────────────────────┤
│  Frontend Development (WebStorm + Junie)            │
│  ├── Component scaffolding with Junie               │
│  ├── Store + API client generation                  │
│  ├── TypeScript type checking via JetBrains         │
│  └── Hot reload testing with run configurations     │
├─────────────────────────────────────────────────────┤
│  Verification & Delivery                            │
│  ├── npm run build (TypeScript catches mismatches)  │
│  ├── Simulation validation (500 rounds × 11 maps)   │
│  └── E2E: simulate exact frontend API call flows    │
└─────────────────────────────────────────────────────┘
\`\`\`

---

**Impact of JetBrains + Junie on Development:**
- **Code Quality:** JetBrains' static analysis + Junie's suggestions caught type mismatches and logic errors early
- **Velocity:** Junie accelerated boilerplate-heavy tasks (18 service files, 40+ React components, data scripts)
- **Refactoring Confidence:** JetBrains' rename-safe refactoring enabled the "Tactical Vision" → "Gameplan" rebrand across the entire codebase without breakage
- **Dual-Language Workflow:** Seamless switching between Python (backend) and TypeScript (frontend) within one IDE ecosystem
`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6. C9 REALISM
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'c9-realism',
    title: 'C9 Player Realism',
    subsections: [
      {
        id: 'c9-profiles',
        title: 'Player Profiles',
        content: `
### Cloud9 Roster Simulation

The simulation includes detailed profiles for each Cloud9 player, derived from 5.6MB of player-specific movement and combat data.

**C9 Roster Profiles:**

| Player | Role | Primary Weapon | Aggression | HS Rate | K/D |
|--------|------|---------------|------------|---------|-----|
| OXY | Duelist | Vandal | 0.72 | 31% | 1.24 |
| v1c | Duelist | Vandal | 0.68 | 28% | 1.18 |
| xeppaa | Initiator | Vandal | 0.55 | 25% | 1.12 |
| neT | Controller | Phantom | 0.42 | 22% | 0.98 |
| mitch | Sentinel | Vandal | 0.48 | 24% | 1.05 |

**Player-Specific Patterns:**
- **OXY:** High aggression duelist, prefers wide swings, first-contact player
- **v1c:** Calculated duelist, trades efficiently, site anchor during post-plant
- **xeppaa:** Information gatherer, uses abilities before committing, rotates on intel
- **neT:** Smoke placement optimized for site executes, passive positioning
- **mitch:** Trip wire and sentinel utility, holds flanks, late rotator

**Data Source:** \`c9_movement_models.json\` (5.6MB) — extracted from VCT matches featuring Cloud9, containing per-player:
- Movement heat maps (where each player typically positions)
- Engagement distance preferences
- Trade response timing
- Spike carrier tendencies
- Post-plant positioning patterns
`,
      },
      {
        id: 'c9-methodology',
        title: 'Realism Methodology',
        content: `
### How Player Realism is Achieved

**Three-Layer Approach:**

1. **Base Simulation Engine** — Generic VCT-calibrated behavior that applies to all players (movement speed, engagement rates, phase timing)

2. **Role-Based Behavior** — Entry, Support, Lurk, Anchor, Controller roles determine macro-level movement patterns and decision priorities

3. **Player-Specific Modifiers** — Individual adjustments from \`c9_movement_models.json\` that fine-tune aggression, positioning, trade awareness, and ability timing per player

**Realism Scoring:**
Each simulation round is scored against pro behavior benchmarks:
- Position similarity (are players where pros would be?)
- Timing accuracy (do rotations happen when expected?)
- Engagement patterns (are fights happening at realistic distances?)
- Outcome distribution (does the win rate match VCT data?)

**Behavioral Patterns from VCT Data:**

| Role | Trade Rate | HS Rate | First Kill % |
|------|-----------|---------|-------------|
| Duelist | 34.1% | 23.3% | 15.0% |
| Initiator | 32.5% | 21.8% | 10.2% |
| Controller | 29.9% | 19.6% | 7.1% |
| Sentinel | 28.8% | 13.3% | 8.9% |

These role-specific stats are applied as modifiers to the base combat model, ensuring that duelists entry frag more often and sentinels hold passive angles as expected.
`,
      },
    ],
  },
];

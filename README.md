# C9 Gameplan — Frontend

VALORANT tactical simulation and analysis platform for Cloud9 coaching staff. WebGL-powered simulation canvas, tactical planner with VCT ghost paths, match archive with AI narration, and comprehensive documentation.

**Live:** https://c9-gameplan-frontend.vercel.app

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **TailwindCSS 4** — utility-first styling with C9 design tokens
- **Zustand** — state management (simulation, camera, strategy stores)
- **Pixi.js** — WebGL canvas for map rendering, player markers, FOV cones
- **Framer Motion + GSAP** — UI animations and camera pan/zoom during AI narration
- **React Query + Axios** — data fetching and caching
- **Lucide React** — icon system

## Features

- **Live Simulation** — 5v5 round simulation with real-time Pixi.js canvas, playback controls (0.5x–4x), Monte Carlo analysis (10–50 iterations)
- **Tactical Planner** — 4-phase planning (Setup/Mid-Round/Execute/Post-Plant), waypoint placement on VCT ghost paths, per-phase AI narration, What-If chat
- **VCT Match Archive** — browse 11 maps, replay rounds with interpolated pro positions, AI narration with moment-by-moment analysis
- **AI Coaching** — SSE-streamed narration, What-If chat, scouting reports across all tools
- **Documentation** — comprehensive `/docs` page covering every system

## Getting Started

```bash
npm install
npm run dev    # http://localhost:3000
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000   # Backend URL
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # / — Live Simulation
│   ├── tactical/         # /tactical — Tactical Planner
│   ├── matches/          # /matches — VCT Match Archive
│   └── docs/             # /docs — Documentation
├── components/
│   ├── simulation/       # Canvas, controls, HUD panels
│   ├── strategy/         # Tactical planner components
│   ├── matches/          # Match archive components
│   ├── coaching/         # AI narration, chat, scouting
│   ├── docs/             # Documentation view
│   └── ui/               # Shared UI (Markdown, etc.)
├── store/
│   ├── simulation.ts     # Simulation state + API
│   ├── strategy.ts       # Tactical planner state
│   └── camera.ts         # Canvas camera control
└── lib/                  # API client, utilities
```

## Scripts

```bash
npm run dev       # Development server (port 3000)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # ESLint
```

## Deployment

Deployed on **Vercel**. Set `NEXT_PUBLIC_API_URL` to the Cloud Run backend URL in Vercel environment variables.

## Built With

Cloud9 Esports + JetBrains IDE + Junie AI — Sky's the Limit Hackathon 2026

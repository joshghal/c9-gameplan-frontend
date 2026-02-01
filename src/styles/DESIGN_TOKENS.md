# C9 Tactical Vision — Design Tokens

## Visual Direction
**Tactical Tech HUD** — Cyberpunk FUI + VALORANT + Cloud9 Esports

## Color Palette

### Brand
| Token | Hex | Usage |
|-------|-----|-------|
| `--c9-cyan` | `#00AEEF` | Primary brand, CTAs, links |
| `--c9-cyan-light` | `#33BFFF` | Hover states, gradients |
| `--c9-cyan-dark` | `#0088CC` | Gradient endpoints |

### Game Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--val-red` | `#ff4654` | Attack side, kills, danger |
| `--val-teal` | `#12d4b4` | Defense side, safe states |
| `--neon-purple` | `#b967ff` | AI/coaching, playback |
| `--neon-yellow` | `#ffe600` | Spike, warnings, highlights |

### Backgrounds (darkest to lightest)
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-abyss` | `#06080d` | Page background |
| `--bg-primary` | `#0a0e17` | Panel/card surfaces |
| `--bg-secondary` | `#111823` | Nested containers |
| `--bg-elevated` | `#1a2233` | Hover, popovers, inputs |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#e8eaed` | Headings, important data |
| `--text-secondary` | `#7a8599` | Body text, descriptions |
| `--text-tertiary` | `#3d4654` | Muted labels, timestamps |

## Typography

| Role | Font | Usage |
|------|------|-------|
| Display/Labels | `Rajdhani` | Headings, nav, button labels, section titles |
| Body | `Geist` | Paragraphs, descriptions |
| Data | `JetBrains Mono` | Timers, coordinates, stats, counters |
| HUD | `Share Tech Mono` | Small HUD overlays, map hints |

## Component Classes

### Panels
- `.hud-panel` — Base: `--bg-secondary` bg, `--border-default` border, `--clip-corner` shape, scanline overlay
- `.hud-panel-cyan` / `-red` / `-teal` / `-purple` — Top accent line variant

### Buttons
- `.btn-tactical` — Transparent bg, cyan border, uppercase Rajdhani, hover glow + scale
- `.btn-c9` — Filled cyan gradient, black text, primary CTA
- `.btn-tactical-red` / `-teal` — Color variants

### Data
- `.data-readout` — JetBrains Mono, tabular-nums
- `.data-readout-lg` — 1.5rem bold variant

### Effects
- `.text-glow-cyan` / `-red` / `-teal` — Neon text shadow
- `.text-gradient-c9` — Cyan gradient text fill
- `.scanlines` — Horizontal line overlay
- `.corner-brackets` — FUI corner decoration
- `.glow-border-cyan` / `-red` / `-teal` — Border + box-shadow glow

### Animations
- `.animate-fade-in` — Slide up + fade (0.3s)
- `.kill-flash` — Red inset border flash (0.4s)
- `.skeleton-hud` — Angular shimmer loading
- `.pulse-glow` — Breathing cyan glow (2s loop)

## Clip Paths

| Token | Shape |
|-------|-------|
| `--clip-corner-sm` | 4px angular corners |
| `--clip-corner` | 8px angular corners |
| `--clip-corner-lg` | 16px angular corners |

## Rules

- **No `rounded-*` Tailwind classes** — use `clip-path` for angular shapes
- **No Tailwind color classes** (e.g. `text-gray-400`) — use CSS variables via `style={{ color: 'var(--text-secondary)' }}`
- **No `bg-white/5` or `bg-black/40`** — use `var(--bg-elevated)`, `var(--bg-primary)`, etc.
- **Always use Rajdhani** for labels, headings, and button text
- **Always use JetBrains Mono** for numeric data displays
- Player markers use **diamond clip-path**: `polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)`

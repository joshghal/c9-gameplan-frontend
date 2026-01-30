import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function normalizedToPixel(
  normalizedX: number,
  normalizedY: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  return {
    x: normalizedX * containerWidth,
    y: normalizedY * containerHeight,
  };
}

export const AGENT_COLORS: Record<string, string> = {
  // Duelists - Red/Orange
  jett: '#38bdf8',
  phoenix: '#f97316',
  reyna: '#a855f7',
  raze: '#f59e0b',
  yoru: '#3b82f6',
  neon: '#22d3ee',
  iso: '#8b5cf6',

  // Initiators - Green
  sova: '#22c55e',
  breach: '#f97316',
  skye: '#84cc16',
  kayo: '#6b7280',
  fade: '#a78bfa',
  gekko: '#4ade80',

  // Controllers - Blue/Purple
  brimstone: '#ef4444',
  omen: '#6366f1',
  viper: '#22c55e',
  astra: '#c084fc',
  harbor: '#06b6d4',
  clove: '#f472b6',

  // Sentinels - Yellow/White
  sage: '#38bdf8',
  cypher: '#fbbf24',
  killjoy: '#facc15',
  chamber: '#d4d4d4',
  deadlock: '#6b7280',
  vyse: '#a78bfa',

  // Default
  unknown: '#9ca3af',
};

export const TEAM_COLORS = {
  attack: {
    primary: '#ef4444',
    secondary: '#fca5a5',
    bg: 'rgba(239, 68, 68, 0.2)',
  },
  defense: {
    primary: '#3b82f6',
    secondary: '#93c5fd',
    bg: 'rgba(59, 130, 246, 0.2)',
  },
};

export const PHASE_NAMES: Record<string, string> = {
  opening: 'Opening',
  mid_round: 'Mid Round',
  post_plant: 'Post Plant',
  retake: 'Retake',
};
